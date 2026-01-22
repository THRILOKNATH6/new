const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/it/orderController');
const MasterController = require('../controllers/it/masterController');
const authMiddleware = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/rbacMiddleware');

router.use(authMiddleware);

// IT Manager / Order Management Routes
router.get('/orders', requirePermission('MANAGE_ORDERS'), OrderController.getOrders);
router.get('/orders/:id', requirePermission('MANAGE_ORDERS'), OrderController.getOrderDetails);
router.post('/orders', requirePermission('MANAGE_ORDERS'), OrderController.createOrder);
router.put('/orders/:id', requirePermission('MANAGE_ORDERS'), OrderController.updateOrder);
router.delete('/orders/:id', requirePermission('MANAGE_ORDERS'), OrderController.deleteOrder);

// Master Data Routes (IT Manager Only)
router.post('/masters/styles', requirePermission('MANAGE_ORDERS'), MasterController.createStyle);
router.get('/masters/styles', requirePermission('MANAGE_ORDERS'), MasterController.getStyles);

router.post('/masters/agelists', requirePermission('MANAGE_ORDERS'), MasterController.createAgeGroup);
router.get('/masters/agelists', requirePermission('MANAGE_ORDERS'), MasterController.getAgeGroups);

router.post('/masters/categories', requirePermission('MANAGE_ORDERS'), MasterController.createCategory);
router.get('/masters/categories', requirePermission('MANAGE_ORDERS'), MasterController.getCategories);

router.post('/masters/size-categories', requirePermission('MANAGE_ORDERS'), MasterController.createSizeCategory);
router.get('/masters/size-categories', requirePermission('MANAGE_ORDERS'), MasterController.getSizeCategories);
router.put('/masters/size-categories/:id/sizes', requirePermission('MANAGE_ORDERS'), MasterController.appendSizesToCategory);

router.post('/masters/colours', requirePermission('MANAGE_ORDERS'), MasterController.createColor);
router.get('/masters/colours', requirePermission('MANAGE_ORDERS'), MasterController.getColors);

module.exports = router;
