const express = require('express');
const router = express.Router();
const CuttingController = require('../controllers/cuttingController');
const authMiddleware = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/rbacMiddleware');

router.use(authMiddleware);

/**
 * CUTTING MODULE ROUTES
 * Role: CUTTING_MANAGER
 */

// 1. Read-only access to orders for the Cutting Manager
router.get('/orders', requirePermission('VIEW_ORDERS'), CuttingController.getOrders);

// 2. View full order details and size quantities
router.get('/orders/:id', requirePermission('VIEW_ORDERS'), CuttingController.getOrderDetails);

// 3. Add / Update cutting entries against an order
router.post('/orders/:id/cutting', requirePermission('MANAGE_CUTTING'), CuttingController.saveCutting);

module.exports = router;
