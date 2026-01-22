const db = require('../config/db');

class CuttingRepository {
    async getOrders() {
        const query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            ORDER BY o.order_id DESC
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    async getOrderWithSizes(orderId) {
        const query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.order_id = $1
        `;
        const { rows } = await db.query(query, [orderId]);
        return rows[0];
    }

    async getDynamicOrderQty(tableName, orderId) {
        const query = `SELECT * FROM ${tableName} WHERE order_id = $1`;
        const { rows } = await db.query(query, [orderId]);
        return rows[0];
    }

    async getExistingCuttingQty(orderId) {
        const query = `
            SELECT size, SUM(qty) as cut_qty
            FROM cutting
            WHERE order_id = $1
            GROUP BY size
        `;
        const { rows } = await db.query(query, [orderId.toString()]);
        return rows;
    }

    async saveCuttingEntries(client, entries) {
        // We use ON CONFLICT to handle "Update existing" if lay_no is repeated
        // But usually, common practice is to treat the input as new qty.
        // If it's "update existing", it might mean updating that specific lay.
        const query = `
            INSERT INTO cutting (order_id, lay_no, style_id, colour_code, size, qty)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (style_id, lay_no, colour_code, size)
            DO UPDATE SET qty = EXCLUDED.qty -- Setting to the new value for that lay
            RETURNING *
        `;

        const results = [];
        for (const entry of entries) {
            const values = [
                entry.orderId.toString(),
                entry.layNo || 1, // Default to 1 if not provided, but we should provide it
                entry.styleId,
                entry.colourCode,
                entry.size,
                entry.qty
            ];
            const { rows } = await client.query(query, values);
            results.push(rows[0]);
        }
        return results;
    }

    async getAggregateStats(orderId, tableName, sizeList) {
        // Fetch order quantities from dynamic table
        const orderQty = await this.getDynamicOrderQty(tableName, orderId);

        // Fetch cumulative cut quantities for this order
        const cutQtyRows = await this.getExistingCuttingQty(orderId);
        const cutQtyMap = {};
        cutQtyRows.forEach(row => {
            cutQtyMap[row.size.toLowerCase()] = parseInt(row.cut_qty, 10);
        });

        const stats = {
            totalOrderQty: 0,
            totalCutQty: 0,
            sizes: []
        };

        sizeList.forEach(size => {
            const lowerSize = size.toLowerCase();
            const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
            const cQty = cutQtyMap[lowerSize] || 0;

            stats.totalOrderQty += oQty;
            stats.totalCutQty += cQty;

            stats.sizes.push({
                size: size,
                orderQty: oQty,
                cutQty: cQty,
                // Size-wise percentage
                percentage: oQty > 0 ? parseFloat(((cQty / oQty) * 100).toFixed(2)) : 0
            });
        });

        // Total Cutting Percentage
        stats.totalPercentage = stats.totalOrderQty > 0
            ? parseFloat(((stats.totalCutQty / stats.totalOrderQty) * 100).toFixed(2))
            : 0;

        return stats;
    }
}

module.exports = new CuttingRepository();
