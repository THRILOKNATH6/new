const CuttingService = require('../../services/cuttingService');

class CuttingController {
    async getOrders(req, res) {
        try {
            const orders = await CuttingService.getOrders();
            res.json({ success: true, data: orders });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getOrderDetails(req, res) {
        try {
            const { id } = req.params;
            const data = await CuttingService.getOrderDetails(id);
            res.json({ success: true, data });
        } catch (err) {
            res.status(err.message === 'Order not found' ? 404 : 500)
                .json({ success: false, message: err.message });
        }
    }

    async saveCutting(req, res) {
        try {
            const { id } = req.params;
            const stats = await CuttingService.saveCutting(id, req.body, req.user);
            res.json({
                success: true,
                message: 'Cutting saved successfully',
                data: stats
            });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new CuttingController();
