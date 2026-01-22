const CuttingRepo = require('../repositories/cuttingRepo');
const MasterRepo = require('../repositories/it/masterRepo');
const db = require('../config/db');

class CuttingService {
    async getOrders() {
        return await CuttingRepo.getOrders();
    }

    async getOrderDetails(orderId) {
        const order = await CuttingRepo.getOrderWithSizes(orderId);
        if (!order) throw new Error('Order not found');

        const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
        const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

        const stats = await CuttingRepo.getAggregateStats(orderId, tableName, sizeList);

        return {
            order,
            stats
        };
    }

    async saveCutting(orderId, payload, user) {
        // 1. Validate role = CUTTING_MANAGER or SYSTEM_ADMIN
        const isManager = user.permissions && user.permissions.includes('MANAGE_CUTTING');
        const isAdmin = user.permissions && user.permissions.includes('SYSTEM_ADMIN');

        if (!isManager && !isAdmin) {
            throw new Error('Unauthorized: Only Cutting Managers can perform this action');
        }

        const { layNo, cuttings } = payload;

        // 2. Resolve order and size category
        const order = await CuttingRepo.getOrderWithSizes(orderId);
        if (!order) throw new Error('Order not found');

        const tableName = MasterRepo.getTableNameForCategory(order.size_category_name);
        const sizeList = order.sizes ? order.sizes.split(',').map(s => s.trim()) : [];

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 3. Fetch data for validation
            const currentStats = await CuttingRepo.getAggregateStats(orderId, tableName, sizeList);

            const entriesToSave = [];
            for (const item of cuttings) {
                const sizeInfo = currentStats.sizes.find(s => s.size.toLowerCase() === item.size.toLowerCase());
                if (!sizeInfo) continue;

                const newQty = parseInt(item.qty || 0, 10);
                if (newQty < 0) throw new Error(`Invalid quantity for size ${item.size}`);

                // 6. Validate cutting limits: (Already Cut + New) MUST NOT exceed Order Qty
                if (sizeInfo.cutQty + newQty > sizeInfo.orderQty) {
                    throw new Error(`Cutting limit exceeded for size ${item.size}. Order Qty: ${sizeInfo.orderQty}, Current Total: ${sizeInfo.cutQty}. Max added allowed: ${sizeInfo.orderQty - sizeInfo.cutQty}`);
                }

                if (newQty > 0) {
                    entriesToSave.push({
                        orderId,
                        layNo: layNo || 1,
                        styleId: order.style_id,
                        colourCode: order.colour_code,
                        size: item.size,
                        qty: newQty
                    });
                }
            }

            // 7. Insert / update cutting data transactionally
            if (entriesToSave.length > 0) {
                const query = `
                    INSERT INTO cutting (order_id, lay_no, style_id, colour_code, size, qty)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (style_id, lay_no, colour_code, size)
                    DO UPDATE SET qty = cutting.qty + EXCLUDED.qty
                    RETURNING *
                `;

                for (const entry of entriesToSave) {
                    await client.query(query, [
                        entry.orderId.toString(),
                        entry.layNo,
                        entry.styleId,
                        entry.colourCode,
                        entry.size,
                        entry.qty
                    ]);
                }
            }

            await client.query('COMMIT');

            // 8. Recalculate percentages and return final stats
            return await CuttingRepo.getAggregateStats(orderId, tableName, sizeList);

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new CuttingService();
