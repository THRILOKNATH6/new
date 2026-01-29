const express = require('express');
const router = express.Router();
const CuttingController = require('../controllers/cuttingController');
const BundleController = require('../controllers/bundleController');
const authMiddleware = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/rbacMiddleware');

router.use(authMiddleware);

/**
 * CUTTING MODULE ROUTES
 * Role: CUTTING_MANAGER
 */

// ============================================================================
// CUTTING OPERATIONS
// ============================================================================

// 1. Read-only access to orders for the Cutting Manager
router.get('/orders', requirePermission('VIEW_ORDERS'), CuttingController.getOrders);

// 1b. Advanced search orders with filtering
router.get('/orders/search', requirePermission('VIEW_ORDERS'), CuttingController.searchOrders);

// 2. View full order details and size quantities
router.get('/orders/:id', requirePermission('VIEW_ORDERS'), CuttingController.getOrderDetails);

// 3. Add / Update cutting entries against an order
router.post('/orders/:id/cutting', requirePermission('MANAGE_CUTTING'), CuttingController.saveCutting);

// 4. Get all cutting records for management (with filters)
router.get('/records', requirePermission('MANAGE_CUTTING'), CuttingController.getCuttingRecords);

// 5. Update specific cutting record
router.put('/:id', requirePermission('MANAGE_CUTTING'), CuttingController.updateCutting);

// 6. Delete specific cutting record
router.delete('/:id', requirePermission('MANAGE_CUTTING'), CuttingController.deleteCutting);

// ============================================================================
// BUNDLE MANAGEMENT ROUTES
// ============================================================================

// 0. Get all bundle records for management (with filters)
router.get('/bundles/records', requirePermission('MANAGE_CUTTING'), BundleController.getBundleRecords);

// 1. Get bundle statistics for an order (order qty, cut qty, bundled qty, available)
router.get('/:orderId/bundles/stats', requirePermission('MANAGE_CUTTING'), BundleController.getBundleStats);

// 2. Get all bundles for an order (optionally filtered by size via query param)
router.get('/:orderId/bundles', requirePermission('MANAGE_CUTTING'), BundleController.getBundlesByOrder);

// 3. Get cutting entries available for bundling (with remaining quantities)
router.get('/:orderId/bundles/available/:size', requirePermission('MANAGE_CUTTING'), BundleController.getAvailableCuttingEntries);

// 4. Get next available bundle number for auto-calculation
router.get('/bundles/next-number', requirePermission('MANAGE_CUTTING'), BundleController.getNextBundleNumber);

// 5. Create a new bundle
router.post('/bundles', requirePermission('MANAGE_CUTTING'), BundleController.createBundle);

// 6. Update an existing bundle
router.put('/bundles/:bundleId', requirePermission('MANAGE_CUTTING'), BundleController.updateBundle);

// 7. Delete an existing bundle
router.delete('/bundles/:bundleId', requirePermission('MANAGE_CUTTING'), BundleController.deleteBundle);

module.exports = router;
