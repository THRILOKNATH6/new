const express = require('express');
const router = express.Router();
const LoadingController = require('../controllers/production/loadingController');
const authMiddleware = require('../middlewares/authMiddleware');
const rbacMiddleware = require('../middlewares/rbacMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Dashboard & General Info
router.get('/dashboard', LoadingController.getDashboard);
router.get('/lines', LoadingController.getLines); // New active lines endpoint
router.get('/bundles/:orderId', LoadingController.getBundles); // New bundle fetch endpoint
router.get('/orders/search', LoadingController.searchOrders); // New order search endpoint (no RBAC)
router.get('/verify-employee/:empId', LoadingController.verifyEmployee);
router.get('/recommendation/:lineNo', LoadingController.getRecommendation);

// Transaction creation (Supermarket access checked in service)
router.post('/transactions', LoadingController.createTransaction);

// State transitions
router.post('/transactions/:loadingId/approve', LoadingController.approve);
router.post('/transactions/:loadingId/reject', LoadingController.reject);
router.post('/transactions/:loadingId/handover', LoadingController.handover);

module.exports = router;
