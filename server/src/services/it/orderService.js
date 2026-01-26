const db = require('../../config/db');
const OrderRepo = require('../../repositories/it/orderRepo');
const MasterRepo = require('../../repositories/it/masterRepo');

class OrderService {

    async createOrder(data) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const sizeCatId = data.size_category;
            if (!sizeCatId) throw new Error("Size category is mandatory for order creation");

            const sizeCatDef = await MasterRepo.getSizeCategoryById(sizeCatId);
            if (!sizeCatDef) throw new Error(`Size Category ID ${sizeCatId} is invalid`);

            const cleanSizes = sizeCatDef.sizes.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
            const qtyTableName = MasterRepo.getTableNameForCategory(sizeCatDef.size_category_name);
            const samSeamTableName = MasterRepo.getSamSeamTableName(sizeCatDef.size_category_name);
            const loadingTableName = MasterRepo.getLoadingTableName(sizeCatDef.size_category_name);

            await OrderRepo.ensureOrderQtyTable(client, qtyTableName, cleanSizes);
            await MasterRepo.ensureSamSeamTable(client, samSeamTableName, cleanSizes);
            await MasterRepo.ensureLoadingTable(client, loadingTableName, cleanSizes);

            const maxId = await OrderRepo.getMaxOrderId(client);
            const newOrderId = maxId + 1;

            const createdOrder = await OrderRepo.createOrder(client, { ...data, order_id: newOrderId });

            if (data.quantities && Object.keys(data.quantities).length > 0) {
                await OrderRepo.createDynamicOrderQty(client, qtyTableName, newOrderId, data.quantities);
            }

            await client.query('COMMIT');
            return createdOrder;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async updateOrder(orderId, data) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const currentOrder = await OrderRepo.getOrderById(orderId);
            if (!currentOrder) throw new Error("Order not found");

            const oldSizeCatId = currentOrder.size_category;
            const newSizeCatId = data.size_category;

            // 1. Re-validate masters if needed (Repository already handles null-safety but Service enforces mandatory fields)
            if (!newSizeCatId) throw new Error("Size category is mandatory");
            const newSizeCatDef = await MasterRepo.getSizeCategoryById(newSizeCatId);
            if (!newSizeCatDef) throw new Error("Invalid size category");

            const newQtyTableName = MasterRepo.getTableNameForCategory(newSizeCatDef.size_category_name);
            const cleanSizes = newSizeCatDef.sizes.split(',').map(s => s.trim().toLowerCase()).filter(s => s);

            // 2. Ensure new tables exist (ERP-Grade Idempotent)
            const newLoadingTableName = MasterRepo.getLoadingTableName(newSizeCatDef.size_category_name);
            await OrderRepo.ensureOrderQtyTable(client, newQtyTableName, cleanSizes);
            await MasterRepo.ensureLoadingTable(client, newLoadingTableName, cleanSizes);

            // 3. Handle Size Category Change (Cleanup Old Data)
            if (oldSizeCatId != newSizeCatId) {
                const oldSizeCatDef = await MasterRepo.getSizeCategoryById(oldSizeCatId);
                if (oldSizeCatDef) {
                    const oldQtyTableName = MasterRepo.getTableNameForCategory(oldSizeCatDef.size_category_name);
                    await OrderRepo.deleteDynamicOrderQty(client, oldQtyTableName, orderId);
                }
            } else {
                // If same category, still delete before insert to handle partial qty updates easily (Atomic Replace)
                await OrderRepo.deleteDynamicOrderQty(client, newQtyTableName, orderId);
            }

            // 4. Update Main Order
            const updatedOrder = await OrderRepo.updateOrder(client, orderId, data);

            // 5. Insert New QTY
            if (data.quantities && Object.keys(data.quantities).length > 0) {
                await OrderRepo.createDynamicOrderQty(client, newQtyTableName, orderId, data.quantities);
            }

            await client.query('COMMIT');
            return updatedOrder;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteOrder(orderId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const order = await OrderRepo.getOrderById(orderId);
            if (!order) throw new Error("Order not found");

            // Cleanup Dynamic QTY Table
            if (order.size_category) {
                const sizeCatDef = await MasterRepo.getSizeCategoryById(order.size_category);
                if (sizeCatDef) {
                    const qtyTableName = MasterRepo.getTableNameForCategory(sizeCatDef.size_category_name);
                    await OrderRepo.deleteDynamicOrderQty(client, qtyTableName, orderId);
                }
            }

            // Delete Main Record
            const deleted = await OrderRepo.deleteOrder(client, orderId);

            await client.query('COMMIT');
            return deleted;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getAllOrders() {
        return await OrderRepo.getAllOrders();
    }

    async getOrderDetails(orderId) {
        const order = await OrderRepo.getOrderById(orderId);
        if (!order) throw new Error("Order not found");

        let quantities = {};
        if (order.size_category) {
            const sizeCatDef = await MasterRepo.getSizeCategoryById(order.size_category);
            if (sizeCatDef) {
                const tableName = MasterRepo.getTableNameForCategory(sizeCatDef.size_category_name);
                const qtyRow = await OrderRepo.getDynamicQty(tableName, orderId);
                if (qtyRow) {
                    const { order_id, ...onlyQtys } = qtyRow;
                    quantities = onlyQtys;
                }
            }
        }
        return { ...order, quantities };
    }

}

module.exports = new OrderService();
