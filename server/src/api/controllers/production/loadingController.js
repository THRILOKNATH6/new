const LoadingService = require('../../../services/production/loadingService');

class LoadingController {
    async getDashboard(req, res) {
        try {
            const data = await LoadingService.getDashboardData(req.user);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getLines(req, res) {
        try {
            const data = await LoadingService.getActiveLines(req.user);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getBundles(req, res) {
        try {
            const { orderId } = req.params;
            const data = await LoadingService.getBundlesForOrder(orderId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async searchOrders(req, res) {
        try {
            const data = await LoadingService.searchOrders(req.query);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async verifyEmployee(req, res) {
        try {
            const { empId } = req.params;
            const data = await LoadingService.getEmployeeDetails(empId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getRecommendation(req, res) {
        try {
            const { lineNo } = req.params;
            const data = await LoadingService.getRecommendation(lineNo);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async createTransaction(req, res) {
        try {
            const result = await LoadingService.createTransaction(req.body, req.user);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async approve(req, res) {
        try {
            const { loadingId } = req.params;
            const { categoryName, approverId } = req.body;
            const result = await LoadingService.approveTransaction(loadingId, categoryName, approverId, req.user);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async reject(req, res) {
        try {
            const { loadingId } = req.params;
            const { categoryName } = req.body;
            const result = await LoadingService.rejectTransaction(loadingId, categoryName, req.user);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async handover(req, res) {
        try {
            const { loadingId } = req.params;
            const { categoryName, handoverId, variantStyleId } = req.body;
            const result = await LoadingService.handoverTransaction(loadingId, categoryName, handoverId, variantStyleId, req.user);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new LoadingController();
