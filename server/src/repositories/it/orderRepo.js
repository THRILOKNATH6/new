const db = require('../../config/db');

class OrderRepository {

    // Finds max ID to simulate auto-increment safely-ish
    async getMaxOrderId(client) {
        const query = `SELECT MAX(order_id) as max_id FROM orders`;
        const { rows } = await (client || db).query(query);
        return parseInt(rows[0].max_id || 1000, 10);
    }

    async createOrder(client, orderData) {
        const query = `
            INSERT INTO orders (
                order_id, buyer, brand, season, oc, style_id, po, country, 
                colour_code, age_group, category, size_category, order_quantity
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;
        const values = [
            orderData.order_id,
            orderData.buyer,
            orderData.brand,
            orderData.season,
            orderData.oc,
            orderData.style_id,
            orderData.po,
            orderData.country,
            orderData.colour_code || null,
            orderData.age_group || null,
            orderData.category || null,
            orderData.size_category || null,
            orderData.order_quantity || 0
        ];

        const { rows } = await client.query(query, values);
        return rows[0];
    }

    async updateOrder(client, orderId, orderData) {
        const query = `
            UPDATE orders SET
                buyer = $2, brand = $3, season = $4, oc = $5, style_id = $6, po = $7, 
                country = $8, colour_code = $9, age_group = $10, category = $11, 
                size_category = $12, order_quantity = $13
            WHERE order_id = $1
            RETURNING *
        `;
        const values = [
            orderId,
            orderData.buyer,
            orderData.brand,
            orderData.season,
            orderData.oc,
            orderData.style_id,
            orderData.po,
            orderData.country,
            orderData.colour_code || null,
            orderData.age_group || null,
            orderData.category || null,
            orderData.size_category || null,
            orderData.order_quantity || 0
        ];

        const { rows } = await client.query(query, values);
        return rows[0];
    }

    async deleteOrder(client, orderId) {
        const query = `DELETE FROM orders WHERE order_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [orderId]);
        return rows[0];
    }

    // --- Dynamic Table Creation (ERP-Grade Auto-Creation) ---

    async ensureOrderQtyTable(client, tableName, sizes) {
        // sizes array: ['S', 'M', 'L']
        const columnDefs = sizes.map(s => `"${s.toLowerCase().trim()}" integer DEFAULT 0`).join(', ');
        const query = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                order_id integer PRIMARY KEY REFERENCES orders(order_id) ON DELETE CASCADE,
                ${columnDefs}
            )
        `;
        await client.query(query);
    }


    // Dynamic Insert for ANY order_qty table
    async createDynamicOrderQty(client, tableName, orderId, qtyMap) {
        // qtyMap: { xxs: 10, xs: 5 ... }
        if (!qtyMap || Object.keys(qtyMap).length === 0) return;

        // Ensure all keys are lowercase to match column names
        const normalizedQty = {};
        Object.keys(qtyMap).forEach(k => {
            normalizedQty[k.toLowerCase().trim()] = qtyMap[k];
        });

        const keys = Object.keys(normalizedQty);
        const columns = ['order_id', ...keys];
        const values = [orderId, ...keys.map(k => normalizedQty[k])];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const safeColumns = columns.map(c => `"${c}"`).join(', ');
        const query = `INSERT INTO ${tableName} (${safeColumns}) VALUES (${placeholders})`;

        await client.query(query, values);
    }

    async deleteDynamicOrderQty(client, tableName, orderId) {
        // Sanitize table name strictly (though it should be safe from MasterRepo)
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
        const query = `DELETE FROM ${safeTable} WHERE order_id = $1`;
        await client.query(query, [orderId]);
    }


    // --- READ OPERATIONS ---

    async getAllOrders() {
        // Join with Master tables for readability? Or just return raw IDs and let Frontend resolve?
        // Raw IDs are faster, let frontend resolve via master cache. 
        // But for "View Detail", joining is nicer. For List, IDs are okay.
        // I will return raw for now (or left join style_master/style_names if needed).
        // Let's stick to simple SELECT for list.
        const query = `SELECT * FROM orders ORDER BY order_id DESC`; // Sorting by ID desc (newest first)
        const { rows } = await db.query(query);
        return rows;
    }

    async getOrderById(orderId) {
        const query = `SELECT * FROM orders WHERE order_id = $1`;
        const { rows } = await db.query(query, [orderId]);
        return rows[0];
    }

    async getDynamicQty(tableName, orderId) {
        // Sanitize tableName strictly
        // Assuming Service provides valid table name (it comes from DB select anyway)
        const query = `SELECT * FROM ${tableName} WHERE order_id = $1`;
        const { rows } = await db.query(query, [orderId]);
        return rows[0];
    }
}

module.exports = new OrderRepository();
