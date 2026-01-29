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

    async searchOrders(req, res) {
        try {
            const searchParams = req.query;
            const result = await CuttingService.searchOrders(searchParams);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getCuttingRecords(req, res) {
        try {
            const records = await CuttingService.getCuttingRecords(req.query);
            res.json({ success: true, data: records });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async deleteCutting(req, res) {
        try {
            const { id } = req.params;
            await CuttingService.deleteCutting(id, req.user);
            res.json({ success: true, message: 'Cutting record deleted successfully' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateCutting(req, res) {
        try {
            const { id } = req.params;
            const { qty } = req.body;
            await CuttingService.updateCutting(id, parseInt(qty || 0), req.user);
            res.json({ success: true, message: 'Cutting record updated successfully' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new CuttingController();
