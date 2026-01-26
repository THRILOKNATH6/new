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

        // Filter out completed orders
        const filteredOrders = [];
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Simple check: if no cutting data, include
            const cuttingCheckQuery = `
                SELECT COUNT(*) as count FROM cutting WHERE order_id = $1
            `;
            const cuttingResult = await db.query(cuttingCheckQuery, [order.order_id]);
            const hasCuttingData = parseInt(cuttingResult.rows[0].count, 10) > 0;

            if (!hasCuttingData) {
                filteredOrders.push(order);
                continue;
            }

            // Calculate completion percentage using existing logic
            const MasterRepo = require('../repositories/it/masterRepo');
            const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                
                let totalOrderQty = 0;
                let totalCutQty = 0;
                
                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyRows.find(row => row.size.toLowerCase() === lowerSize)?.cut_qty || 0;
                    
                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                });
                
                const completionPercentage = totalOrderQty > 0
                    ? parseFloat(((totalCutQty / totalOrderQty) * 100).toFixed(2))
                    : 0;
                
                // Only include orders with completion < 100%
                if (completionPercentage < 100) {
                    filteredOrders.push(order);
                }
            } catch (error) {
                // If error in calculation, include the order (failsafe)
                filteredOrders.push(order);
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

        // Filter out completed orders using same logic as getOrders
        const filteredOrders = [];
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Simple check: if no cutting data, include
            const cuttingCheckQuery = `
                SELECT COUNT(*) as count FROM cutting WHERE order_id = $1
            `;
            const cuttingResult = await db.query(cuttingCheckQuery, [order.order_id]);
            const hasCuttingData = parseInt(cuttingResult.rows[0].count, 10) > 0;

            if (!hasCuttingData) {
                filteredOrders.push(order);
                continue;
            }

            // Calculate completion percentage using existing logic
            const MasterRepo = require('../repositories/it/masterRepo');
            const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                
                let totalOrderQty = 0;
                let totalCutQty = 0;
                
                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyRows.find(row => row.size.toLowerCase() === lowerSize)?.cut_qty || 0;
                    
                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                });
                
                const completionPercentage = totalOrderQty > 0
                    ? parseFloat(((totalCutQty / totalOrderQty) * 100).toFixed(2))
                    : 0;
                
                // Only include orders with completion < 100%
                if (completionPercentage < 100) {
                    filteredOrders.push(order);
                }
            } catch (error) {
                // If error in calculation, include the order (failsafe)
                filteredOrders.push(order);
            }
        }
        
        return filteredOrders;
    }

    async getOrdersCount(searchParams = {}) {
        const {
            style_id,
            order_id,
            buyer,
            po
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

        // Filter out completed orders using same logic as getOrders
        let filteredCount = 0;
        for (const order of allOrders) {
            // Skip explicitly COMPLETED orders
            if (order.status === 'COMPLETED') {
                continue;
            }

            // Simple check: if no cutting data, include
            const cuttingCheckQuery = `
                SELECT COUNT(*) as count FROM cutting WHERE order_id = $1
            `;
            const cuttingResult = await db.query(cuttingCheckQuery, [order.order_id]);
            const hasCuttingData = parseInt(cuttingResult.rows[0].count, 10) > 0;

            if (!hasCuttingData) {
                filteredCount++;
                continue;
            }

            // Calculate completion percentage using existing logic
            const MasterRepo = require('../repositories/it/masterRepo');
            const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
            const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

            try {
                const orderQty = await this.getDynamicOrderQty(tableName, order.order_id);
                const cutQtyRows = await this.getExistingCuttingQty(order.order_id);
                
                let totalOrderQty = 0;
                let totalCutQty = 0;
                
                sizeList.forEach(size => {
                    const lowerSize = size.toLowerCase();
                    const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
                    const cQty = cutQtyRows.find(row => row.size.toLowerCase() === lowerSize)?.cut_qty || 0;
                    
                    totalOrderQty += oQty;
                    totalCutQty += cQty;
                });
                
                const completionPercentage = totalOrderQty > 0
                    ? parseFloat(((totalCutQty / totalOrderQty) * 100).toFixed(2))
                    : 0;
                
                // Only count orders with completion < 100%
                if (completionPercentage < 100) {
                    filteredCount++;
                }
            } catch (error) {
                // If error in calculation, include order (failsafe)
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
}

module.exports = new CuttingRepository();