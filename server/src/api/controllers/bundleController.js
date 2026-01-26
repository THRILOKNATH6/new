const BundleService = require('../../services/bundleService');

/**
 * Bundle Controller
 * HTTP request/response handlers for bundle management
 */
class BundleController {
    /**
     * Create a new bundle
     * POST /api/cutting/bundles
     */
    async createBundle(req, res) {
        try {
            const result = await BundleService.createBundle(req.body, req.user);
            res.status(201).json({
                success: true,
                data: result.bundle,
                message: result.message
            });
        } catch (error) {
            console.error('Create bundle error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get bundle statistics for an order
     * GET /api/cutting/:orderId/bundles/stats
     */
    async getBundleStats(req, res) {
        try {
            const { orderId } = req.params;
            const stats = await BundleService.getBundleStats(orderId, req.user);
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get bundle stats error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get bundles for an order (optionally filtered by size)
     * GET /api/cutting/:orderId/bundles?size=M
     */
    async getBundlesByOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { size } = req.query;
            const bundles = await BundleService.getBundlesByOrder(orderId, size, req.user);
            res.status(200).json({
                success: true,
                data: bundles
            });
        } catch (error) {
            console.error('Get bundles error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get cutting entries available for bundling
     * GET /api/cutting/:orderId/bundles/available/:size
     */
    async getAvailableCuttingEntries(req, res) {
        try {
            const { orderId, size } = req.params;
            const entries = await BundleService.getAvailableCuttingEntries(orderId, size, req.user);
            res.status(200).json({
                success: true,
                data: entries
            });
        } catch (error) {
            console.error('Get available cutting entries error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get next available bundle number
     * GET /api/cutting/bundles/next-number?styleId=ST-001&colourCode=NAVY
     */
    async getNextBundleNumber(req, res) {
        try {
            const { styleId, colourCode } = req.query;
            if (!styleId || !colourCode) {
                return res.status(400).json({
                    success: false,
                    message: 'styleId and colourCode are required'
                });
            }
            const nextNumber = await BundleService.getNextBundleNumber(styleId, colourCode);
            res.status(200).json({
                success: true,
                data: { nextStartingNumber: nextNumber }
            });
        } catch (error) {
            console.error('Get next bundle number error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Update bundle
     * PUT /api/cutting/bundles/:bundleId
     */
    async updateBundle(req, res) {
        try {
            const { bundleId } = req.params;
            const result = await BundleService.updateBundle(bundleId, req.body, req.user);
            res.status(200).json({
                success: true,
                data: result.bundle,
                message: result.message
            });
        } catch (error) {
            console.error('Update bundle error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new BundleController();
