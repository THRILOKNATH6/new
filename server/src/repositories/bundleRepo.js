const db = require('../config/db');

/**
 * Bundle Repository
 * Data access layer for bundle management
 * Handles all database operations for the bundling table
 */
class BundleRepository {
    /**
     * Create a new bundle
     * @param {Object} client - Database client (for transactions)
     * @param {Object} bundleData - Bundle data
     * @returns {Promise<Object>} Created bundle
     */
    async create(client, bundleData) {
        const query = `
            INSERT INTO bundling (
                cutting_id, 
                style_id, 
                colour_code, 
                size, 
                qty, 
                starting_no, 
                ending_no,
                created_by,
                last_changed_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            bundleData.cutting_id,
            bundleData.style_id,
            bundleData.colour_code,
            bundleData.size,
            bundleData.qty,
            bundleData.starting_no,
            bundleData.ending_no,
            bundleData.created_by,
            bundleData.last_changed_by
        ];

        const { rows } = await client.query(query, values);
        return rows[0];
    }

    /**
     * Find bundle by ID
     * @param {number} bundleId - Bundle ID
     * @returns {Promise<Object|null>} Bundle or null
     */
    async findById(bundleId) {
        const query = `
            SELECT b.*, c.order_id, c.lay_no
            FROM bundling b
            JOIN cutting c ON b.cutting_id = c.cutting_id
            WHERE b.bundle_id = $1
        `;
        const { rows } = await db.query(query, [bundleId]);
        return rows[0] || null;
    }

    /**
     * Get all bundles for a specific cutting entry
     * @param {Object} client - Database client
     * @param {number} cuttingId - Cutting ID
     * @returns {Promise<Array>} Array of bundles
     */
    async getByCuttingId(client, cuttingId) {
        const query = `
            SELECT * FROM bundling
            WHERE cutting_id = $1
            ORDER BY starting_no ASC
        `;
        const { rows } = await client.query(query, [cuttingId]);
        return rows;
    }

    /**
     * Get all bundles for an order (across all cutting entries)
     * @param {string} orderId - Order ID
     * @param {string} size - Optional size filter
     * @returns {Promise<Array>} Array of bundles with cutting details
     */
    async getByOrder(orderId, size = null) {
        let query = `
            SELECT 
                b.*,
                c.order_id,
                c.lay_no,
                c.qty as cutting_qty
            FROM bundling b
            JOIN cutting c ON b.cutting_id = c.cutting_id
            WHERE c.order_id = $1
        `;

        const params = [orderId.toString()];

        if (size) {
            query += ` AND b.size = $2`;
            params.push(size);
        }

        query += ` ORDER BY b.size, b.starting_no ASC`;

        const { rows } = await db.query(query, params);
        return rows;
    }

    /**
     * Get bundled quantities grouped by size for an order
     * @param {string} orderId - Order ID
     * @returns {Promise<Array>} Array of {size, bundled_qty}
     */
    async getBundledQtyByOrder(orderId) {
        const query = `
            SELECT 
                b.size,
                SUM(b.qty) as bundled_qty
            FROM bundling b
            JOIN cutting c ON b.cutting_id = c.cutting_id
            WHERE c.order_id = $1
            GROUP BY b.size
        `;
        const { rows } = await db.query(query, [orderId.toString()]);
        return rows;
    }

    /**
     * Check if a bundle range overlaps with existing bundles
     * @param {Object} client - Database client
     * @param {string} styleId - Style ID
     * @param {string} colourCode - Colour code
     * @param {number} startingNo - Starting number
     * @param {number} endingNo - Ending number
     * @returns {Promise<boolean>} True if overlap exists
     */
    async checkRangeOverlap(client, styleId, colourCode, startingNo, endingNo) {
        const query = `
            SELECT COUNT(*) as count
            FROM bundling
            WHERE style_id = $1
            AND colour_code = $2
            AND (
                (starting_no <= $3 AND ending_no >= $3) OR
                (starting_no <= $4 AND ending_no >= $4) OR
                (starting_no >= $3 AND ending_no <= $4)
            )
        `;
        const { rows } = await client.query(query, [styleId, colourCode, startingNo, endingNo]);
        return parseInt(rows[0].count, 10) > 0;
    }

    /**
     * Update bundle
     * @param {Object} client - Database client
     * @param {number} bundleId - Bundle ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} Updated bundle
     */
    async update(client, bundleId, updateData) {
        const query = `
            UPDATE bundling
            SET 
                qty = $1,
                starting_no = $2,
                ending_no = $3,
                last_changed_by = $4
            WHERE bundle_id = $5
            RETURNING *
        `;

        const values = [
            updateData.qty,
            updateData.starting_no,
            updateData.ending_no,
            updateData.last_changed_by,
            bundleId
        ];

        const { rows } = await client.query(query, values);
        return rows[0];
    }

    /**
     * Get next available starting number for a style/colour combination
     * @param {string} styleId - Style ID
     * @param {string} colourCode - Colour code
     * @returns {Promise<number>} Next available starting number
     */
    async getNextStartingNumber(styleId, colourCode) {
        const query = `
            SELECT COALESCE(MAX(ending_no), 0) + 1 as next_start
            FROM bundling
            WHERE style_id = $1 AND colour_code = $2
        `;
        const { rows } = await db.query(query, [styleId, colourCode]);
        return rows[0].next_start;
    }

    /**
     * Get cutting entries available for bundling (with remaining quantities)
     * @param {string} orderId - Order ID
     * @param {string} size - Size
     * @returns {Promise<Array>} Cutting entries with available quantities
     */
    async getCuttingEntriesForBundling(orderId, size) {
        const query = `
            SELECT 
                c.cutting_id,
                c.lay_no,
                c.style_id,
                c.colour_code,
                c.size,
                c.qty as cutting_qty,
                COALESCE(SUM(b.qty), 0) as bundled_qty,
                c.qty - COALESCE(SUM(b.qty), 0) as available_qty
            FROM cutting c
            LEFT JOIN bundling b ON c.cutting_id = b.cutting_id
            WHERE c.order_id = $1 AND c.size = $2
            GROUP BY c.cutting_id, c.lay_no, c.style_id, c.colour_code, c.size, c.qty
            HAVING c.qty - COALESCE(SUM(b.qty), 0) > 0
            ORDER BY c.lay_no ASC
        `;
        const { rows } = await db.query(query, [orderId.toString(), size]);
        return rows;
    }
    /**
     * Delete bundle
     * @param {Object} client - Database client
     * @param {number} bundleId - Bundle ID
     * @returns {Promise<Object>} Deleted bundle
     */
    async delete(client, bundleId) {
        const query = `DELETE FROM bundling WHERE bundle_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [bundleId]);
        return rows[0];
    }

    /**
     * Check if bundle is used in downstream processes (tracking)
     * @param {number} bundleId - Bundle ID
     * @returns {Promise<boolean>} True if used
     */
    async checkUsage(bundleId) {
        const query = `SELECT COUNT(*) as count FROM bundle_tracking_op_wise WHERE bundle_id = $1`;
        const { rows } = await db.query(query, [bundleId]);
        return parseInt(rows[0].count, 10) > 0;
    }

    /**
     * Get all bundle records with filters for management
     * @param {Object} filters - Search filters
     * @returns {Promise<Array>} Array of bundles
     */
    async getBundleRecords(filters = {}) {
        let query = `
            SELECT b.*, c.lay_no, o.buyer, o.order_id as full_order_id
            FROM bundling b
            JOIN cutting c ON b.cutting_id = c.cutting_id
            JOIN orders o ON c.order_id = o.order_id::text
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.styleId) {
            query += ` AND (b.style_id ILIKE $${paramIndex} OR o.style_id ILIKE $${paramIndex})`;
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

        query += ` ORDER BY b.created_at DESC, b.bundle_id DESC LIMIT 100`;

        const { rows } = await db.query(query, params);
        return rows;
    }
}

module.exports = new BundleRepository();
