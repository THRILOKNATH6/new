const db = require('../config/db');

class CuttingRepository {
    async getOrders() {
        // First get all orders
        const baseQuery = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            ORDER BY o.order_id DESC
        `;
        const result = await db.query(baseQuery);
        const allOrders = result.rows;

        // Filter out orders based on BUNDLING completion (not cutting completion)
        const filteredOrders = [];
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Calculate BUNDLING completion percentage using BundleService logic
            const BundleRepo = require('./bundleRepo');
            const MasterRepo = require('../repositories/it/masterRepo');
            const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                // Get order quantities from dynamic table
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);

                // Get cutting quantities (grouped by size)
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                const cutQtyMap = {};
                for (const cutRow of cutQtyRows) {
                    cutQtyMap[cutRow.size.toLowerCase()] = parseInt(cutRow.cut_qty, 10);
                }

                // Get bundled quantities (grouped by size) - KEY CHANGE
                const bundledQtyRows = await BundleRepo.getBundledQtyByOrder(order.order_id);
                const bundledQtyMap = {};
                for (const bundleRow of bundledQtyRows) {
                    bundledQtyMap[bundleRow.size.toLowerCase()] = parseInt(bundleRow.bundled_qty, 10);
                }

                // Calculate totals for bundling percentage
                let totalOrderQty = 0;
                let totalCutQty = 0;
                let totalBundledQty = 0;

                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyMap[lowerSize] || 0;
                    const bQty = bundledQtyMap[lowerSize] || 0;

                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                    totalBundledQty += bQty;
                });

                // Calculate BUNDLING completion percentage
                const bundlingCompletionPercentage = totalCutQty > 0
                    ? parseFloat(((totalBundledQty / totalCutQty) * 100).toFixed(2))
                    : 0;

                // HIDE order only if bundling is 100% complete
                // SHOW order if bundling < 100% (even if cutting = 100%)
                if (bundlingCompletionPercentage < 100) {
                    // Add cutting completion percentage for badge display
                    const cuttingCompletionPercentage = totalOrderQty > 0
                        ? parseFloat(((totalCutQty / totalOrderQty) * 100).toFixed(2))
                        : 0;

                    filteredOrders.push({
                        ...order,
                        cutting_completion_percentage: cuttingCompletionPercentage,
                        bundling_completion_percentage: bundlingCompletionPercentage
                    });
                }
            } catch (error) {
                // If error in calculation, include the order (failsafe)
                filteredOrders.push({
                    ...order,
                    cutting_completion_percentage: 0,
                    bundling_completion_percentage: 0
                });
            }
        }

        return filteredOrders;
    }

    async searchOrders(searchParams = {}) {
        const {
            style_id,
            order_id,
            buyer,
            po,
            q, // Generic search term
            limit = 50,
            offset = 0,
            sort_by = 'order_id',
            sort_order = 'DESC'
        } = searchParams;

        // Build base query with search filters
        let query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (q) {
            query += ` AND (o.style_id ILIKE $${paramIndex} OR o.po ILIKE $${paramIndex} OR o.buyer ILIKE $${paramIndex} OR o.order_id::text ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        if (style_id) {
            query += ` AND o.style_id ILIKE $${paramIndex++}`;
            params.push(`%${style_id}%`);
        }

        if (order_id) {
            query += ` AND o.order_id = $${paramIndex++}`;
            params.push(parseInt(order_id));
        }

        if (buyer) {
            query += ` AND o.buyer ILIKE $${paramIndex++}`;
            params.push(`%${buyer}%`);
        }

        if (po) {
            query += ` AND o.po ILIKE $${paramIndex++}`;
            params.push(`%${po}%`);
        }

        // Validate sort field to prevent SQL injection
        const allowedSortFields = ['order_id', 'buyer', 'brand', 'style_id', 'po', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'order_id';
        const validSortOrder = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY o.${validSortBy} ${validSortOrder}`;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        // Get all matching orders
        const result = await db.query(query, params);
        const allOrders = result.rows;

        // Filter out orders based on BUNDLING completion (not cutting completion)
        const filteredOrders = [];
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Calculate BUNDLING completion percentage using BundleService logic
            const BundleRepo = require('./bundleRepo');
            const MasterRepo = require('../repositories/it/masterRepo'); // Ensure imported
            let tableName;
            try {
                tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            } catch (e) {
                // If category is invalid, skip intelligent filtering and show the order
                filteredOrders.push({ ...order, cutting_completion_percentage: 0, bundling_completion_percentage: 0 });
                continue;
            }

            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                // Get order quantities from dynamic table
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);

                // Get cutting quantities (grouped by size)
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                const cutQtyMap = {};
                for (const cutRow of cutQtyRows) {
                    cutQtyMap[cutRow.size.toLowerCase()] = parseInt(cutRow.cut_qty, 10);
                }

                // Get bundled quantities (grouped by size) - KEY CHANGE
                const bundledQtyRows = await BundleRepo.getBundledQtyByOrder(order.order_id);
                const bundledQtyMap = {};
                for (const bundleRow of bundledQtyRows) {
                    bundledQtyMap[bundleRow.size.toLowerCase()] = parseInt(bundleRow.bundled_qty, 10);
                }

                // Calculate totals for bundling percentage
                let totalOrderQty = 0;
                let totalCutQty = 0;
                let totalBundledQty = 0;

                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyMap[lowerSize] || 0;
                    const bQty = bundledQtyMap[lowerSize] || 0;

                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                    totalBundledQty += bQty;
                });

                // Calculate BUNDLING completion percentage
                const bundlingCompletionPercentage = totalCutQty > 0
                    ? parseFloat(((totalBundledQty / totalCutQty) * 100).toFixed(2))
                    : 0;

                // HIDE order only if bundling is 100% complete
                // SHOW order if bundling < 100% (even if cutting = 100%)
                if (bundlingCompletionPercentage < 100) {
                    // Add cutting completion percentage for badge display
                    const cuttingCompletionPercentage = totalOrderQty > 0
                        ? parseFloat(((totalCutQty / totalOrderQty) * 100).toFixed(2))
                        : 0;

                    filteredOrders.push({
                        ...order,
                        cutting_completion_percentage: cuttingCompletionPercentage,
                        bundling_completion_percentage: bundlingCompletionPercentage
                    });
                }
            } catch (error) {
                // If error in calculation, include the order (failsafe)
                filteredOrders.push({
                    ...order,
                    cutting_completion_percentage: 0,
                    bundling_completion_percentage: 0
                });
            }
        }

        return filteredOrders;
    }

    async getOrdersCount(searchParams = {}) {
        const {
            style_id,
            order_id,
            buyer,
            po,
            q // Generic search
        } = searchParams;

        // Build base query with search filters
        let query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (q) {
            query += ` AND (o.style_id ILIKE $${paramIndex} OR o.po ILIKE $${paramIndex} OR o.buyer ILIKE $${paramIndex} OR o.order_id::text ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        if (style_id) {
            query += ` AND o.style_id ILIKE $${paramIndex++}`;
            params.push(`%${style_id}%`);
        }

        if (order_id) {
            query += ` AND o.order_id = $${paramIndex++}`;
            params.push(parseInt(order_id));
        }

        if (buyer) {
            query += ` AND o.buyer ILIKE $${paramIndex++}`;
            params.push(`%${buyer}%`);
        }

        if (po) {
            query += ` AND o.po ILIKE $${paramIndex++}`;
            params.push(`%${po}%`);
        }

        // Get all matching orders
        const result = await db.query(query, params);
        const allOrders = result.rows;

        // Filter out orders based on BUNDLING completion (not cutting completion)
        let filteredCount = 0;
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Calculate BUNDLING completion percentage using BundleService logic
            const BundleRepo = require('./bundleRepo');
            const MasterRepo = require('../repositories/it/masterRepo'); // Ensure imported
            let tableName;
            try {
                tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            } catch (e) {
                filteredCount++;
                continue;
            }
            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                // Get order quantities from dynamic table
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);

                // Get cutting quantities (grouped by size)
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                const cutQtyMap = {};
                for (const cutRow of cutQtyRows) {
                    cutQtyMap[cutRow.size.toLowerCase()] = parseInt(cutRow.cut_qty, 10);
                }

                // Get bundled quantities (grouped by size) - KEY CHANGE
                const bundledQtyRows = await BundleRepo.getBundledQtyByOrder(order.order_id);
                const bundledQtyMap = {};
                for (const bundleRow of bundledQtyRows) {
                    bundledQtyMap[bundleRow.size.toLowerCase()] = parseInt(bundleRow.bundled_qty, 10);
                }

                // Calculate totals for bundling percentage
                let totalOrderQty = 0;
                let totalCutQty = 0;
                let totalBundledQty = 0;

                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyMap[lowerSize] || 0;
                    const bQty = bundledQtyMap[lowerSize] || 0;

                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                    totalBundledQty += bQty;
                });

                // Calculate BUNDLING completion percentage
                const bundlingCompletionPercentage = totalCutQty > 0
                    ? parseFloat(((totalBundledQty / totalCutQty) * 100).toFixed(2))
                    : 0;

                // HIDE order only if bundling is 100% complete
                // SHOW order if bundling < 100% (even if cutting = 100%)
                if (bundlingCompletionPercentage < 100) {
                    filteredCount++;
                }
            } catch (error) {
                // If error in calculation, include the order (failsafe)
                filteredCount++;
            }
        }

        return filteredCount;
    }

    // Keep all existing methods unchanged below this line
    async getOrderWithSizes(orderId) {
        const query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.order_id = $1
        `;
        const result = await db.query(query, [orderId]);
        return result.rows[0];
    }

    async getDynamicOrderQty(tableName, orderId) {
        const query = `SELECT * FROM ${tableName} WHERE order_id = $1`;
        const result = await db.query(query, [orderId]);
        return result.rows[0];
    }

    async getExistingCuttingQty(orderId) {
        const query = `
            SELECT size, SUM(qty) as cut_qty
            FROM cutting
            WHERE order_id = $1
            GROUP BY size
        `;
        const result = await db.query(query, [orderId.toString()]);
        return result.rows;
    }

    async saveCuttingEntries(client, entries) {
        const query = `
            INSERT INTO cutting (order_id, lay_no, style_id, colour_code, size, qty)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (style_id, lay_no, colour_code, size)
            DO UPDATE SET qty = EXCLUDED.qty
            RETURNING *
        `;

        const results = [];
        for (const entry of entries) {
            const values = [
                entry.orderId.toString(),
                entry.layNo || 1,
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
        const orderQty = await this.getDynamicOrderQty(tableName, orderId);
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
                percentage: oQty > 0 ? parseFloat(((cQty / oQty) * 100).toFixed(2)) : 0
            });
        });

        stats.totalPercentage = stats.totalOrderQty > 0
            ? parseFloat(((stats.totalCutQty / stats.totalOrderQty) * 100).toFixed(2))
            : 0;

        return stats;
    }

    // --- Record Management Methods ---

    async getCuttingRecords(filters = {}) {
        let query = `
            SELECT c.*, o.buyer, o.style_id as order_style_id
            FROM cutting c
            JOIN orders o ON c.order_id = o.order_id::text
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.styleId) {
            query += ` AND (c.style_id ILIKE $${paramIndex} OR o.style_id ILIKE $${paramIndex})`;
            params.push(`%${filters.styleId}%`);
            paramIndex++;
        }

        if (filters.orderId) {
            query += ` AND c.order_id = $${paramIndex}`;
            params.push(filters.orderId.toString());
            paramIndex++;
        }

        if (filters.buyer) {
            query += ` AND o.buyer ILIKE $${paramIndex}`;
            params.push(`%${filters.buyer}%`);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC, c.lay_no DESC LIMIT 100`;

        const { rows } = await db.query(query, params);
        return rows;
    }

    async getCuttingById(id) {
        const query = `
            SELECT c.*, o.buyer
            FROM cutting c
            JOIN orders o ON c.order_id = o.order_id::text
            WHERE c.cutting_id = $1
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async deleteCutting(id, client = db) {
        const query = `DELETE FROM cutting WHERE cutting_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [id]);
        return rows[0];
    }

    async updateCuttingQty(id, qty, client = db) {
        const query = `UPDATE cutting SET qty = $2 WHERE cutting_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [id, qty]);
        return rows[0];
    }
}

module.exports = new CuttingRepository();