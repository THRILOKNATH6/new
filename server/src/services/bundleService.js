const CuttingRepo = require('../repositories/cuttingRepo');
const MasterRepo = require('../repositories/it/masterRepo');
const BundleRepo = require('../repositories/bundleRepo');
const db = require('../config/db');

class BundleService {
    /**
     * Get bundle statistics for an order
     * @param {string} orderId - Order ID
     * @param {Object} user - Authenticated user
     * @returns {Promise<Object>} Statistics per size
     */
    async getBundleStats(orderId, user) {
        const orderData = await CuttingRepo.getOrderWithSizes(orderId);
        if (!orderData) {
            throw new Error('Order not found');
        }

        const tableName = MasterRepo.getTableNameForCategory(orderData.size_category_name);
        const sizeList = orderData.sizes ? orderData.sizes.split(',').map(s => s.trim()) : [];

        // 2. Get order quantities from dynamic table
        const orderQty = await CuttingRepo.getDynamicOrderQty(tableName, orderId);

        // 3. Get cutting quantities (grouped by size)
        const cutQtyRows = await CuttingRepo.getExistingCuttingQty(orderId);
        const cutQtyMap = {};
        for (const cutRow of cutQtyRows) {
            cutQtyMap[cutRow.size.toLowerCase()] = parseInt(cutRow.cut_qty, 10);
        }

        // 4. Get bundled quantities (grouped by size)
        const bundledQtyRows = await BundleRepo.getBundledQtyByOrder(orderId);
        const bundledQtyMap = {};
        for (const bundleRow of bundledQtyRows) {
            bundledQtyMap[bundleRow.size.toLowerCase()] = parseInt(bundleRow.bundled_qty, 10);
        }

        // 5. Calculate statistics per size
        const stats = {
            orderId: orderData.order_id,
            buyer: orderData.buyer,
            styleId: orderData.style_id,
            colourCode: orderData.colour_code,
            totalOrderQty: 0,
            totalCutQty: 0,
            totalBundledQty: 0,
            sizes: []
        };

        sizeList.forEach(size => {
            const lowerSize = size.toLowerCase();
            const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
            const cQty = cutQtyMap[lowerSize] || 0;
            const bQty = bundledQtyMap[lowerSize] || 0;

            // Calculate percentages
            const cuttingPercentage = oQty > 0 ? parseFloat(((cQty / oQty) * 100).toFixed(2)) : 0;
            const bundlingPercentage = cQty > 0 ? parseFloat(((bQty / cQty) * 100).toFixed(2)) : 0;

            // Determine statuses
            const cuttingStatus = cuttingPercentage === 100 ? 'COMPLETE' : `NOT COMPLETE (${cuttingPercentage}%)`;
            const bundlingStatus = bundlingPercentage === 100 ? 'COMPLETE' : `NOT COMPLETE (${bundlingPercentage}%)`;

            stats.totalOrderQty += oQty;
            stats.totalCutQty += cQty;
            stats.totalBundledQty += bQty;

            stats.sizes.push({
                size: size,
                orderQty: oQty,
                cutQty: cQty,
                bundledQty: bQty,
                availableForCutting: oQty - cQty,
                availableForBundling: cQty - bQty,
                cuttingPercentage: cuttingPercentage,
                bundlingPercentage: bundlingPercentage,
                cuttingStatus: cuttingStatus,
                bundlingStatus: bundlingStatus
            });
        });

        // Overall percentages and statuses
        stats.totalCuttingPercentage = stats.totalOrderQty > 0
            ? parseFloat(((stats.totalCutQty / stats.totalOrderQty) * 100).toFixed(2))
            : 0;

        stats.totalBundlingPercentage = stats.totalCutQty > 0
            ? parseFloat(((stats.totalBundledQty / stats.totalCutQty) * 100).toFixed(2))
            : 0;

        stats.totalCuttingStatus = stats.totalCuttingPercentage === 100 ? 'COMPLETE' : `NOT COMPLETE (${stats.totalCuttingPercentage}%)`;
        stats.totalBundlingStatus = stats.totalBundlingPercentage === 100 ? 'COMPLETE' : `NOT COMPLETE (${stats.totalBundlingPercentage}%)`;

        return stats;
    }

    /**
     * Get next bundle number for a style/color combination
     * @param {string} styleId - Style ID
     * @param {string} colourCode - Colour code
     * @returns {Promise} Next starting number
     */
    async getNextBundleNumber(styleId, colourCode) {
        // Get the highest ending number for this style/color
        const nextNumber = await BundleRepo.getNextStartingNumber(styleId, colourCode);
        return nextNumber;
    }

    /**
     * Create a new bundle
     * @param {Object} bundleData - Bundle data
     * @param {Object} user - Authenticated user
     * @returns {Promise<Object>} Created bundle
     */
    async createBundle(bundleData, user) {
        const { cuttingId, qty, startingNo, endingNo } = bundleData;

        // Validate role
        const isManager = user.permissions && user.permissions.includes('MANAGE_CUTTING');
        const isAdmin = user.permissions && user.permissions.includes('SYSTEM_ADMIN');
        if (!isManager && !isAdmin) {
            throw new Error('Unauthorized: Only Cutting Managers can perform this action');
        }

        // Validate input
        if (!cuttingId || !qty || !startingNo || !endingNo) {
            throw new Error('Missing required fields: cuttingId, qty, startingNo, endingNo');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Get cutting entry details
            const cuttingQuery = `
                SELECT c.*, o.order_id, o.buyer, o.style_id, o.colour_code
                FROM cutting c
                JOIN orders o ON c.order_id = o.order_id::text
                WHERE c.cutting_id = $1
            `;
            const cuttingResult = await client.query(cuttingQuery, [cuttingId]);
            if (cuttingResult.rows.length === 0) {
                throw new Error('Cutting entry not found');
            }
            const cuttingEntry = cuttingResult.rows[0];

            // Validate piece range
            const calculatedQty = endingNo - startingNo + 1;
            if (calculatedQty !== parseInt(qty)) {
                throw new Error(`Bundle quantity (${qty}) does not match piece range (${startingNo}-${endingNo} = ${calculatedQty})`);
            }

            // Check for overlapping ranges
            const hasOverlap = await BundleRepo.checkRangeOverlap(
                client,
                cuttingEntry.style_id,
                cuttingEntry.colour_code,
                startingNo,
                endingNo
            );
            if (hasOverlap) {
                throw new Error('Bundle range overlaps with existing bundles');
            }

            // Check available quantity
            const availableQuery = `
                SELECT c.qty - COALESCE(SUM(b.qty), 0) as available_qty
                FROM cutting c
                LEFT JOIN bundling b ON c.cutting_id = b.cutting_id
                WHERE c.cutting_id = $1
                GROUP BY c.cutting_id, c.qty
            `;
            const availableResult = await client.query(availableQuery, [cuttingId]);
            const availableQty = parseInt(availableResult.rows[0].available_qty, 10);

            if (parseInt(qty) > availableQty) {
                throw new Error(`Bundle quantity (${qty}) exceeds available quantity (${availableQty})`);
            }

            // Create bundle
            const bundleData = {
                cutting_id: cuttingId,
                style_id: cuttingEntry.style_id,
                colour_code: cuttingEntry.colour_code,
                size: cuttingEntry.size,
                qty: parseInt(qty),
                starting_no: parseInt(startingNo),
                ending_no: parseInt(endingNo),
                created_by: user.user_id,
                last_changed_by: user.user_id
            };

            const createdBundle = await BundleRepo.create(client, bundleData);

            await client.query('COMMIT');

            return {
                bundle: createdBundle,
                message: 'Bundle created successfully'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get bundles for an order
     * @param {string} orderId - Order ID
     * @param {string} size - Optional size filter
     * @param {Object} user - Authenticated user
     * @returns {Promise<Array>} Array of bundles
     */
    async getBundlesByOrder(orderId, size, user) {
        return await BundleRepo.getByOrder(orderId, size);
    }

    /**
     * Get cutting entries available for bundling
     * @param {string} orderId - Order ID
     * @param {string} size - Size
     * @param {Object} user - Authenticated user
     * @returns {Promise<Array>} Available cutting entries
     */
    async getAvailableCuttingEntries(orderId, size, user) {
        return await BundleRepo.getCuttingEntriesForBundling(orderId, size);
    }

    async getBundleRecords(filters) {
        return await BundleRepo.getBundleRecords(filters);
    }

    /**
     * Delete bundle
     * @param {number} bundleId - Bundle ID
     * @param {Object} user - Authenticated user
     */
    async deleteBundle(bundleId, user) {
        // Validate role
        const isManager = user.permissions && user.permissions.includes('MANAGE_CUTTING');
        const isAdmin = user.permissions && user.permissions.includes('SYSTEM_ADMIN');
        if (!isManager && !isAdmin) {
            throw new Error('Unauthorized');
        }

        // Check if bundle is used (scanned)
        const isUsed = await BundleRepo.checkUsage(bundleId);
        if (isUsed) {
            throw new Error('Cannot delete: Bundle has already been scanned or processed in production.');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const deleted = await BundleRepo.delete(client, bundleId);
            await client.query('COMMIT');
            return deleted;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update bundle
     * @param {number} bundleId - Bundle ID
     * @param {Object} updateData - Update data
     * @param {Object} user - Authenticated user
     * @returns {Promise<Object>} Updated bundle
     */
    async updateBundle(bundleId, updateData, user) {
        // Validate role
        const isManager = user.permissions && user.permissions.includes('MANAGE_CUTTING');
        const isAdmin = user.permissions && user.permissions.includes('SYSTEM_ADMIN');
        if (!isManager && !isAdmin) {
            throw new Error('Unauthorized: Only Cutting Managers can perform this action');
        }

        const { qty, startingNo, endingNo } = updateData;

        // Validate input
        if (!qty || !startingNo || !endingNo) {
            throw new Error('Missing required fields: qty, startingNo, endingNo');
        }

        // Validate piece range
        const calculatedQty = endingNo - startingNo + 1;
        if (calculatedQty !== parseInt(qty)) {
            throw new Error(`Bundle quantity (${qty}) does not match piece range (${startingNo}-${endingNo} = ${calculatedQty})`);
        }

        // ADDITIONAL CHECK: cannot update if used
        const isUsed = await BundleRepo.checkUsage(bundleId);
        if (isUsed) {
            throw new Error('Cannot update: Bundle has already been scanned or processed in production.');
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Get existing bundle
            const existingBundle = await BundleRepo.findById(bundleId);
            if (!existingBundle) {
                throw new Error('Bundle not found');
            }

            // Check for overlapping ranges (excluding current bundle)
            const overlapQuery = `
                SELECT COUNT(*) as count
                FROM bundling
                WHERE style_id = $1 AND colour_code = $2 AND bundle_id != $3
                AND (
                    (starting_no <= $4 AND ending_no >= $4) OR
                    (starting_no <= $5 AND ending_no >= $5) OR
                    (starting_no >= $4 AND ending_no <= $5)
                )
            `;
            const overlapResult = await client.query(overlapQuery, [
                existingBundle.style_id,
                existingBundle.colour_code,
                bundleId,
                startingNo,
                endingNo
            ]);

            if (parseInt(overlapResult.rows[0].count, 10) > 0) {
                throw new Error('Bundle range overlaps with existing bundles');
            }

            // Check available quantity
            const availableQuery = `
                SELECT c.qty - COALESCE(SUM(b.qty), 0) as available_qty
                FROM cutting c
                LEFT JOIN bundling b ON c.cutting_id = b.cutting_id
                WHERE c.cutting_id = $1 AND b.bundle_id != $2
                GROUP BY c.cutting_id, c.qty
            `;
            const availableResult = await client.query(availableQuery, [existingBundle.cutting_id, bundleId]);
            const availableQty = parseInt(availableResult.rows[0].available_qty, 10) + existingBundle.qty;

            if (parseInt(qty) > availableQty) {
                throw new Error(`Bundle quantity (${qty}) exceeds available quantity (${availableQty})`);
            }

            // Update bundle
            const updatedBundle = await BundleRepo.update(client, bundleId, {
                qty: parseInt(qty),
                starting_no: parseInt(startingNo),
                ending_no: parseInt(endingNo),
                last_changed_by: user.user_id
            });

            await client.query('COMMIT');

            return {
                bundle: updatedBundle,
                message: 'Bundle updated successfully'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new BundleService();
