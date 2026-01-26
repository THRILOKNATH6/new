const db = require('../../config/db');

class MasterRepository {

    async getMaxId(table, column) {
        const query = `SELECT MAX(${column}) as max_id FROM ${table}`;
        try {
            const { rows } = await db.query(query);
            return rows[0].max_id ? parseInt(rows[0].max_id, 10) : 0;
        } catch (err) {
            console.warn(`Failed to get max ID for ${table}:`, err.message);
            return 0;
        }
    }

    // Helper: Deterministic Table Name
    getTableNameForCategory(categoryName) {
        // "MEN TOP" -> "order_qty_men_top", "CAT1" -> "order_qty_cat1"
        return `order_qty_${categoryName.trim().toLowerCase().replace(/\s+/g, '_')}`;
    }

    // Helper: Deterministic Table Name for SAM/SEAM
    getSamSeamTableName(categoryName) {
        // "MEN TOP" -> "size_men_top_op_sam_seam"
        const slug = categoryName.trim().toLowerCase().replace(/\s+/g, '_');
        return `size_${slug}_op_sam_seam`;
    }

    // Helper: Deterministic Table Name for Loading
    getLoadingTableName(categoryName) {
        // "MEN TOP" -> "loading_men_top"
        const slug = categoryName.trim().toLowerCase().replace(/\s+/g, '_');
        return `loading_${slug}`;
    }

    /**
     * Idempotent table management for SAM/Operations tables.
     * Ensures structure matches reference and corrects legacy columns to INTEGER counts.
     */
    async ensureSamSeamTable(client, tableName, sizes) {
        // tableName: size_{X}_op_sam_seam
        // 1. Create base table with EXACT match of non-size columns from reference
        const query = `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
                operation_id SERIAL PRIMARY KEY,
                style_id character varying(50) NOT NULL REFERENCES style_master(style_id) ON DELETE CASCADE,
                operation_name character varying(150) NOT NULL,
                operation_sequence integer NOT NULL,
                machine_type character varying(50),
                sam numeric(5,3) NOT NULL DEFAULT 0.000,
                cutting_part_no integer,
                created_by character varying(50),
                last_changed_by character varying(50),
                CONSTRAINT "uniq_style_op_seq_${tableName}" UNIQUE (style_id, operation_sequence)
            )
        `;
        await client.query(query);

        // 2. Idempotent Column Management (Safety Checks for Existing Tables)
        const auditColumns = ['created_by', 'last_changed_by'];
        for (const col of auditColumns) {
            const { rows } = await client.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [tableName, col]);
            if (rows.length === 0) {
                await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${col}" character varying(50)`);
            }
        }

        // Corrects legacy types -> INTEGER for numeric counts
        for (const size of sizes) {
            const sanitizedSize = size.toLowerCase().trim();
            if (!sanitizedSize) continue;

            const checkQuery = `
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `;
            const { rows } = await client.query(checkQuery, [tableName, sanitizedSize]);

            if (rows.length === 0) {
                // Add missing column as INTEGER
                await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${sanitizedSize}" INTEGER DEFAULT NULL`);
            } else if (rows.length > 0 && (rows[0].data_type === 'boolean' || rows[0].data_type === 'numeric')) {
                // MANDATORY CORRECTION: Convert BOOLEAN or DECIMAL to INTEGER
                await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${sanitizedSize}" DROP DEFAULT`);
                await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${sanitizedSize}" TYPE INTEGER USING (NULLIF("${sanitizedSize}"::text, '')::integer)`);
                await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${sanitizedSize}" SET DEFAULT NULL`);
            }
        }

        // 3. Performance Indexes
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_ops_seq_${tableName}" ON "${tableName}" (style_id, operation_sequence)`);
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_ops_style_${tableName}" ON "${tableName}" (style_id)`);
    }

    /**
     * Idempotent management for Loading Assignment tables.
     */
    async ensureLoadingTable(client, tableName, sizes) {
        // tableName: loading_{X}
        // 1. Create base table
        const query = `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
                order_id integer NOT NULL,
                line_no integer NOT NULL,
                PRIMARY KEY (order_id, line_no)
            )
        `;
        await client.query(query);

        // 2. Idempotent Size Column Management
        for (const size of sizes) {
            const sanitizedSize = size.toLowerCase().trim();
            if (!sanitizedSize) continue;

            const checkQuery = `
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `;
            const { rows } = await client.query(checkQuery, [tableName, sanitizedSize]);

            if (rows.length === 0) {
                await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${sanitizedSize}" INTEGER DEFAULT 0`);
            }
        }
    }

    // --- Style ---
    async createStyle(id, name, brand) {
        const query = `INSERT INTO style_master (style_id, style_name, brand) VALUES ($1, $2, $3) RETURNING *`;
        const { rows } = await db.query(query, [id, name, brand]);

        try {
            await db.query(`INSERT INTO style_names (style_id, style_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, name]);
        } catch (e) { /* ignore */ }

        return rows[0];
    }

    async checkStyleExists(id) {
        const { rows } = await db.query("SELECT 1 FROM style_master WHERE style_id = $1", [id]);
        return rows.length > 0;
    }

    async getAllStyles() {
        const { rows } = await db.query("SELECT * FROM style_master ORDER BY created_at DESC LIMIT 100");
        return rows;
    }

    // --- Age Group ---
    async createAgeGroup(id, name, age) {
        const query = `INSERT INTO age_groups (age_group_id, age_group_name, age) VALUES ($1, $2, $3) RETURNING *`;
        const { rows } = await db.query(query, [id, name, age]);
        return rows[0];
    }

    async getAgeGroupByName(name) {
        const { rows } = await db.query("SELECT * FROM age_groups WHERE LOWER(age_group_name) = LOWER($1)", [name]);
        return rows[0];
    }

    async getAllAgeGroups() {
        const { rows } = await db.query("SELECT * FROM age_groups ORDER BY age_group_name");
        return rows;
    }

    // --- Category ---
    async createCategory(id, name) {
        const query = `INSERT INTO categorys (category_id, category_name) VALUES ($1, $2) RETURNING *`;
        const { rows } = await db.query(query, [id, name]);
        return rows[0];
    }

    async getCategoryByName(name) {
        const { rows } = await db.query("SELECT * FROM categorys WHERE LOWER(category_name) = LOWER($1)", [name]);
        return rows[0];
    }

    async getAllCategories() {
        const { rows } = await db.query("SELECT * FROM categorys ORDER BY category_name");
        return rows;
    }

    // --- Size Category ---
    async createSizeCategory(id, name, sizes) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insert Master Record
            const query = `INSERT INTO size_categorys (size_category_id, size_category_name, sizes) VALUES ($1, $2, $3) RETURNING *`;
            const { rows } = await client.query(query, [id, name, sizes]);
            const newRecord = rows[0];

            // 2. Dynamic Table Creation: order_qty_{name}
            const tableName = this.getTableNameForCategory(name);
            const sizeList = sizes.split(',').map(s => s.trim()).filter(s => s);

            if (sizeList.length > 0) {
                const columnDefs = sizeList.map(s => `"${s.toLowerCase()}" integer DEFAULT 0`).join(', ');
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS ${tableName} (
                        order_id integer PRIMARY KEY,
                        ${columnDefs}
                    )
                `;
                await client.query(createTableSQL);
            }

            // 3. SAM/SEAM Table Creation (Corrected DECIMAL measurements)
            const samSeamTable = this.getSamSeamTableName(name);
            await this.ensureSamSeamTable(client, samSeamTable, sizeList);

            // 4. Loading Table Creation (NEW REQUIREMENT)
            const loadingTable = this.getLoadingTableName(name);
            await this.ensureLoadingTable(client, loadingTable, sizeList);

            await client.query('COMMIT');
            return newRecord;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async addSizesToCategory(id, newSizesList) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch current info
            const { rows } = await client.query("SELECT * FROM size_categorys WHERE size_category_id = $1", [id]);
            if (rows.length === 0) throw new Error("Category not found");
            const category = rows[0];

            // 2. Determine Table Name
            const tableName = this.getTableNameForCategory(category.size_category_name);

            // 3. Update Table Schema (Add Columns to order_qty table)
            for (const size of newSizesList) {
                const sanitizedSize = size.trim().toLowerCase();
                try {
                    await client.query(`ALTER TABLE ${tableName} ADD COLUMN "${sanitizedSize}" integer DEFAULT 0`);
                } catch (err) {
                    if (err.code !== '42701') throw err;
                }
            }

            // 4. Update size_categorys.sizes string
            const currentSizes = category.sizes ? category.sizes.split(',').map(s => s.trim()) : [];
            const updatedSizesList = [...new Set([...currentSizes, ...newSizesList.map(s => s.trim())])];
            const updatedSizesStr = updatedSizesList.join(',');

            const updateQuery = `UPDATE size_categorys SET sizes = $1 WHERE size_category_id = $2 RETURNING *`;
            const updateResult = await client.query(updateQuery, [updatedSizesStr, id]);

            // 5. Update SAM/SEAM Table (Sync columns and correct types)
            const samSeamTable = this.getSamSeamTableName(category.size_category_name);
            await this.ensureSamSeamTable(client, samSeamTable, updatedSizesList);

            // 6. Update Loading Table (Sync columns)
            const loadingTable = this.getLoadingTableName(category.size_category_name);
            await this.ensureLoadingTable(client, loadingTable, updatedSizesList);

            await client.query('COMMIT');
            return updateResult.rows[0];

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getSizeCategoryByName(name) {
        const { rows } = await db.query("SELECT * FROM size_categorys WHERE LOWER(size_category_name) = LOWER($1)", [name]);
        return rows[0];
    }

    async getAllSizeCategories() {
        const { rows } = await db.query("SELECT * FROM size_categorys ORDER BY size_category_name");
        return rows;
    }

    async getSizeCategoryById(id) {
        const { rows } = await db.query("SELECT * FROM size_categorys WHERE size_category_id = $1", [id]);
        return rows[0];
    }

    // --- Colour ---
    async createColor(styleId, code, name) {
        const query = `INSERT INTO color_names (style_id, color_code, color_name) VALUES ($1, $2, $3) RETURNING *`;
        const { rows } = await db.query(query, [styleId, code, name]);
        return rows[0];
    }

    async getColorByName(styleId, name) {
        const { rows } = await db.query("SELECT * FROM color_names WHERE style_id = $1 AND LOWER(color_name) = LOWER($2)", [styleId, name]);
        return rows[0];
    }

    async getColorsByStyle(styleId) {
        const { rows } = await db.query("SELECT * FROM color_names WHERE style_id = $1", [styleId]);
        return rows;
    }
}

module.exports = new MasterRepository();
