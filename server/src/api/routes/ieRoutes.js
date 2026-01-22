const express = require('express');
const router = express.Router();
const IEController = require('../controllers/ie/ieController');
const authMiddleware = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/rbacMiddleware');

// All IE routes require login
router.use(authMiddleware);

// Orders (Read Only)
router.get('/orders', requirePermission('VIEW_ORDERS'), IEController.getOrders);
router.get('/orders/:id', requirePermission('VIEW_ORDERS'), IEController.getOrderDetails);

// Employees (Production Only)
router.get('/employees', requirePermission('VIEW_PRODUCTION_EMPLOYEES'), IEController.getProductionEmployees);

// Lines (CRUD)
router.get('/lines', requirePermission('MANAGE_LINES'), IEController.getLines);
router.get('/lines/:id/details', requirePermission('MANAGE_LINES'), IEController.getLineDetails);
router.post('/lines/:id/designate-role', requirePermission('MANAGE_LINES'), IEController.designateRole);
router.post('/lines', requirePermission('MANAGE_LINES'), IEController.createLine);
router.put('/lines/:id', requirePermission('MANAGE_LINES'), IEController.updateLine);
router.delete('/lines/:id', requirePermission('MANAGE_LINES'), IEController.deleteLine);
router.get('/lines/:lineNo/operations', requirePermission('MANAGE_LINES'), IEController.getLineOperations);

// Staff Assignment & Work Updates (New)
router.get('/staff/unassigned', requirePermission('MANAGE_LINES'), IEController.getUnassignedStaff);
router.get('/staff/line/:lineNo', requirePermission('MANAGE_LINES'), IEController.getLineStaff);
router.get('/staff/line/:lineNo/manpower', requirePermission('MANAGE_LINES'), IEController.getLineManpowerDetail);
router.post('/staff/assign', requirePermission('MANAGE_LINES'), IEController.assignStaff);
router.post('/staff/unassign', requirePermission('MANAGE_LINES'), IEController.unassignStaff);
router.put('/staff/work/:empId', requirePermission('MANAGE_LINES'), IEController.updateWork);
router.get('/staff/pool', requirePermission('MANAGE_LINES'), IEController.getStaffPool);
router.get('/masters', requirePermission('MANAGE_LINES'), IEController.getMasters);

// Operations Management
router.get('/operations', requirePermission('MANAGE_OPERATIONS'), IEController.getOperations);
router.post('/operations', requirePermission('MANAGE_OPERATIONS'), IEController.createOperation);
router.put('/operations/:opId', requirePermission('MANAGE_OPERATIONS'), IEController.updateOperation);
router.delete('/operations/:opId', requirePermission('MANAGE_OPERATIONS'), IEController.deleteOperation);

module.exports = router;

