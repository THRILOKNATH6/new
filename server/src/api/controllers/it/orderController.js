const OrderService = require('../../../services/it/orderService');

class OrderController {

    async getOrders(req, res) {
        try {
            const data = await OrderService.getAllOrders();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getOrderDetails(req, res) {
        try {
            const data = await OrderService.getOrderDetails(req.params.id);
            res.json({ success: true, data });
        } catch (err) {
            const status = err.message === 'Order not found' ? 404 : 500;
            res.status(status).json({ success: false, message: err.message });
        }
    }

    async createOrder(req, res) {
        try {
            const { buyer, brand, style_id, po } = req.body;
            if (!buyer || !brand || !style_id || !po) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const order = await OrderService.createOrder(req.body);
            res.status(201).json({ success: true, message: 'Order created', data: order });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async updateOrder(req, res) {
        try {
            const orderId = req.params.id;
            const order = await OrderService.updateOrder(orderId, req.body);
            res.json({ success: true, message: 'Order updated', data: order });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async deleteOrder(req, res) {
        try {
            const orderId = req.params.id;
            await OrderService.deleteOrder(orderId);
            res.json({ success: true, message: 'Order deleted' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new OrderController();
