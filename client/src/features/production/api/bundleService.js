import apiClient from '@/lib/apiClient';

/**
 * Bundle Service
 * Frontend API service for bundle management
 */
const bundleService = {
    /**
     * Get bundle statistics for an order
     * @param {string} orderId - Order ID
     * @returns {Promise} Statistics data
     */
    getBundleStats: (orderId) => {
        return apiClient.get(`/cutting/${orderId}/bundles/stats`);
    },

    /**
     * Get all bundles for an order
     * @param {string} orderId - Order ID
     * @param {string} size - Optional size filter
     * @returns {Promise} Array of bundles
     */
    getBundles: (orderId, size = null) => {
        const params = size ? { size } : {};
        return apiClient.get(`/cutting/${orderId}/bundles`, { params });
    },

    /**
     * Get cutting entries available for bundling
     * @param {string} orderId - Order ID
     * @param {string} size - Size
     * @returns {Promise} Available cutting entries
     */
    getAvailableCuttingEntries: (orderId, size) => {
        return apiClient.get(`/cutting/${orderId}/bundles/available/${size}`);
    },

    /**
     * Get next available bundle number
     * @param {string} styleId - Style ID
     * @param {string} colourCode - Colour code
     * @returns {Promise} Next starting number
     */
    getNextBundleNumber: (styleId, colourCode) => {
        return apiClient.get('/cutting/bundles/next-number', {
            params: { styleId, colourCode }
        });
    },

    /**
     * Create a new bundle
     * @param {Object} bundleData - Bundle data
     * @returns {Promise} Created bundle
     */
    createBundle: (bundleData) => {
        return apiClient.post('/cutting/bundles', bundleData);
    },

    /**
     * Update a bundle
     * @param {number} bundleId - Bundle ID
     * @param {Object} bundleData - Update data
     * @returns {Promise} Updated bundle
     */
    updateBundle: (bundleId, bundleData) => {
        return apiClient.put(`/cutting/bundles/${bundleId}`, bundleData);
    },

    /**
     * Get all bundle records for management
     * @param {Object} filters - Search filters
     */
    getRecords: (filters) => {
        return apiClient.get('/cutting/bundles/records', { params: filters });
    },

    /**
     * Delete a bundle
     * @param {number} bundleId - Bundle ID
     */
    deleteBundle: (bundleId) => {
        return apiClient.delete(`/cutting/bundles/${bundleId}`);
    }
};

export default bundleService;
