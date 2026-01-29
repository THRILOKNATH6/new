const db = require('../../config/db');

class LoadingRepository {
    async getAllTransactions() {
        // SUCCESSFUL: approved_status = 'APPROVED' AND handover_by IS NOT NULL
        return await this.getCompletedTransactions();
    }

    async getCompletedTransactions() {
        // We need to query ALL loading tables for COMPLETED transactions only
        const catQuery = `SELECT size_category_name FROM size_categorys`;
        const { rows: categories } = await db.query(catQuery);

        let allResults = [];
        for (const cat of categories) {
            const tableName = `loading_${cat.size_category_name.toLowerCase().replace(/\s+/g, '_')}`;

            // Check if table exists
            const tableCheck = await db.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [tableName]);

            if (tableCheck.rowCount > 0) {
                const query = `
                    SELECT 
                        l.*, 
                        o.style_id, o.colour_code, o.order_id as full_order_id,
                        line.line_name,
                        e_init.name as creator_name,
                        e_appr.name as approver_name,
                        e_hand.name as handover_name
                    FROM "${tableName}" l
                    JOIN orders o ON l.order_id = o.order_id
                    JOIN lines line ON l.line_no = line.line_no
                    LEFT JOIN employees e_init ON l.created_by = e_init.emp_id
                    LEFT JOIN employees e_appr ON l.approved_by = e_appr.emp_id
                    LEFT JOIN employees e_hand ON l.handover_by = e_hand.emp_id
                    WHERE l.approved_status = 'APPROVED' AND l.handover_by IS NOT NULL
                    ORDER BY l.created_date DESC
                `;
                const { rows } = await db.query(query);
                allResults = allResults.concat(rows.map(r => ({ ...r, category: cat.size_category_name })));
            }
        }

        // Final sort across all categories
        return allResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    async getPendingTransactions() {
        // PENDING APPROVAL: approved_status IS NULL OR PENDING
        const catQuery = `SELECT size_category_name FROM size_categorys`;
        const { rows: categories } = await db.query(catQuery);

        let allResults = [];
        for (const cat of categories) {
            const tableName = `loading_${cat.size_category_name.toLowerCase().replace(/\s+/g, '_')}`;

            // Check if table exists
            const tableCheck = await db.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [tableName]);

            if (tableCheck.rowCount > 0) {
                const query = `
                    SELECT 
                        l.*, 
                        o.style_id, o.colour_code, o.order_id as full_order_id,
                        line.line_name,
                        e_init.name as creator_name,
                        e_appr.name as approver_name,
                        e_hand.name as handover_name
                    FROM "${tableName}" l
                    JOIN orders o ON l.order_id = o.order_id
                    JOIN lines line ON l.line_no = line.line_no
                    LEFT JOIN employees e_init ON l.created_by = e_init.emp_id
                    LEFT JOIN employees e_appr ON l.approved_by = e_appr.emp_id
                    LEFT JOIN employees e_hand ON l.handover_by = e_hand.emp_id
                    WHERE l.approved_status IS NULL OR l.approved_status = 'PENDING_APPROVAL'
                    ORDER BY l.created_date DESC
                `;
                const { rows } = await db.query(query);
                allResults = allResults.concat(rows.map(r => ({ ...r, category: cat.size_category_name })));
            }
        }

        // Final sort across all categories
        return allResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    async getPendingHandoverTransactions() {
        // PENDING HANDOVER: approved_status = 'APPROVED' AND handover_by IS NULL
        const catQuery = `SELECT size_category_name FROM size_categorys`;
        const { rows: categories } = await db.query(catQuery);

        let allResults = [];
        for (const cat of categories) {
            const tableName = `loading_${cat.size_category_name.toLowerCase().replace(/\s+/g, '_')}`;

            // Check if table exists
            const tableCheck = await db.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [tableName]);

            if (tableCheck.rowCount > 0) {
                const query = `
                    SELECT 
                        l.*, 
                        o.style_id, o.colour_code, o.order_id as full_order_id,
                        line.line_name,
                        e_init.name as creator_name,
                        e_appr.name as approver_name,
                        e_hand.name as handover_name
                    FROM "${tableName}" l
                    JOIN orders o ON l.order_id = o.order_id
                    JOIN lines line ON l.line_no = line.line_no
                    LEFT JOIN employees e_init ON l.created_by = e_init.emp_id
                    LEFT JOIN employees e_appr ON l.approved_by = e_appr.emp_id
                    LEFT JOIN employees e_hand ON l.handover_by = e_hand.emp_id
                    WHERE l.approved_status = 'APPROVED' AND l.handover_by IS NULL
                    ORDER BY l.created_date DESC
                `;
                const { rows } = await db.query(query);
                allResults = allResults.concat(rows.map(r => ({ ...r, category: cat.size_category_name })));
            }
        }

        // Final sort across all categories
        return allResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    async findLoadingById(id, categoryName) {
        const tableName = `loading_${categoryName.toLowerCase().replace(/\s+/g, '_')}`;
        const query = `
            SELECT l.*, o.style_id, o.colour_code, o.size_category, sc.size_category_name
            FROM "${tableName}" l
            JOIN orders o ON l.order_id = o.order_id
            JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE l.loading_id = $1
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async createTransaction(client, tableName, data) {
        const columns = ['order_id', 'line_no', 'created_by', 'approved_status'];
        const values = [data.order_id, data.line_no, data.created_by, 'PENDING_APPROVAL'];

        // Add size quantities
        Object.entries(data.quantities).forEach(([size, qty]) => {
            columns.push(`"${size.toLowerCase()}"`);
            values.push(qty);
        });

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
            INSERT INTO "${tableName}" (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;
        const { rows } = await client.query(query, values);
        const transaction = rows[0];

        // Process Linked Bundles (New Feature)
        if (data.bundles && Array.isArray(data.bundles) && data.bundles.length > 0) {
            const categoryName = tableName.replace('loading_', '');

            for (const bundle of data.bundles) {
                // Calculate final qty server-side for safety (though validated on UI)
                // We trust minusQty from input, but fetching original logic would be safer. 
                // For now, assume client passed valid pre-calc if using this simplified flow, 
                // BUT better to just update what we store.
                // We need original qty to calc final.

                // Get original qty first to ensure integrity
                const bRes = await client.query('SELECT qty FROM bundling WHERE bundle_id = $1', [bundle.bundleId]);
                if (bRes.rows.length === 0) continue;

                const originalQty = bRes.rows[0].qty;
                const minusQty = parseInt(bundle.minusQty) || 0;
                const finalQty = Math.max(0, originalQty - minusQty);

                await client.query(`
                    UPDATE bundling SET 
                        loading_tx_id = $1,
                        loading_cat_name = $2,
                        minus_qty = $3,
                        minus_reason = $4,
                        final_qty = $5
                    WHERE bundle_id = $6
                `, [
                    transaction.loading_id,
                    categoryName,
                    minusQty,
                    bundle.reason,
                    finalQty,
                    bundle.bundleId
                ]);
            }
        }

        return transaction;
    }

    async approveTransaction(client, tableName, loadingId, approverId) {
        const query = `
            UPDATE "${tableName}"
            SET approved_by = $1, 
                approved_status = 'APPROVED',
                approved_date = CURRENT_TIMESTAMP
            WHERE loading_id = $2
            RETURNING *
        `;
        const { rows } = await client.query(query, [approverId, loadingId]);
        return rows[0];
    }

    async handoverTransaction(client, tableName, loadingId, handoverId) {
        const query = `
            UPDATE "${tableName}"
            SET handover_by = $1, 
                approved_status = 'COMPLETED',
                handover_date = CURRENT_TIMESTAMP
            WHERE loading_id = $2
            RETURNING *
        `;
        const { rows } = await client.query(query, [handoverId, loadingId]);
        return rows[0];
    }

    async deleteTransaction(client, tableName, loadingId) {
        const query = `DELETE FROM "${tableName}" WHERE loading_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [loadingId]);
        return rows[0];
    }

    async getLastLoadingByLine(lineNo) {
        const catQuery = `SELECT size_category_name FROM size_categorys`;
        const { rows: categories } = await db.query(catQuery);

        let lastLoadings = [];
        for (const cat of categories) {
            const tableName = `loading_${cat.size_category_name.toLowerCase().replace(/\s+/g, '_')}`;
            const tableCheck = await db.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [tableName]);

            if (tableCheck.rowCount > 0) {
                const query = `
                    SELECT l.*, o.style_id, o.colour_code, o.order_id
                    FROM "${tableName}" l
                    JOIN orders o ON l.order_id = o.order_id
                    WHERE l.line_no = $1 AND l.approved_status = 'COMPLETED'
                    ORDER BY l.handover_date DESC
                    LIMIT 1
                `;
                const { rows } = await db.query(query, [lineNo]);
                if (rows.length > 0) lastLoadings.push(rows[0]);
            }
        }

        if (lastLoadings.length === 0) return null;
        return lastLoadings.sort((a, b) => new Date(b.handover_date) - new Date(a.handover_date))[0];
    }

    async getCuttingRecommendations(orderId, styleId, colourCode) {
        // 1. Same Order ID
        const query1 = `
            SELECT order_id, style_id, colour_code, SUM(qty) as total_cut
            FROM cutting
            WHERE order_id = $1
            GROUP BY order_id, style_id, colour_code
        `;
        const res1 = await db.query(query1, [orderId.toString()]);
        if (res1.rows.length > 0) return { type: 'SAME_ORDER', data: res1.rows[0] };

        // 2. Same Style + Same Colour (different order)
        const query2 = `
            SELECT order_id, style_id, colour_code, SUM(qty) as total_cut
            FROM cutting
            WHERE style_id = $1 AND colour_code = $2
            GROUP BY order_id, style_id, colour_code
            LIMIT 1
        `;
        const res2 = await db.query(query2, [styleId, colourCode]);
        if (res2.rows.length > 0) return { type: 'SAME_STYLE_COLOUR', data: res2.rows[0] };

        // 3. Same Style (any colour)
        const query3 = `
            SELECT order_id, style_id, colour_code, SUM(qty) as total_cut
            FROM cutting
            WHERE style_id = $1
            GROUP BY order_id, style_id, colour_code
            LIMIT 1
        `;
        const res3 = await db.query(query3, [styleId]);
        if (res3.rows.length > 0) return { type: 'SAME_STYLE', data: res3.rows[0] };

        return null;
    }
}

module.exports = new LoadingRepository();
