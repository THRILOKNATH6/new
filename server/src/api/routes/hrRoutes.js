const express = require('express');
const router = express.Router();
const HRController = require('../controllers/hr/hrController');
const authMiddleware = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/rbacMiddleware');

// All HR routes require login
router.use(authMiddleware);

// --- Employee Management ---
// To View Employees: Need 'VIEW_HR_DATA'
router.get('/employees', requirePermission('VIEW_HR_DATA'), HRController.getEmployees);

// To Create/Update: Need 'MANAGE_EMPLOYEES'
router.post('/employees', requirePermission('MANAGE_EMPLOYEES'), HRController.createEmployee);
router.put('/employees/:empId', requirePermission('MANAGE_EMPLOYEES'), HRController.updateEmployee);

// --- Department Management ---
// Usually same permission as Manage Employees or separate. Using MANAGE_EMPLOYEES for simplicity per prompt.
router.get('/departments', requirePermission('VIEW_HR_DATA'), HRController.getDepartments);
router.post('/departments', requirePermission('MANAGE_EMPLOYEES'), HRController.createDepartment);

// --- Designation Management ---
router.get('/designations', requirePermission('VIEW_HR_DATA'), HRController.getDesignations);
router.post('/designations', requirePermission('MANAGE_EMPLOYEES'), HRController.createDesignation);

// --- Mapping Management ---
router.get('/mappings', requirePermission('VIEW_HR_DATA'), HRController.getMapping);
router.get('/departments/:deptId/designations', requirePermission('VIEW_HR_DATA'), HRController.getDesignationsByDept);
router.post('/mappings', requirePermission('MANAGE_EMPLOYEES'), HRController.addMapping);
router.delete('/mappings/:departmentId/:designationId', requirePermission('MANAGE_EMPLOYEES'), HRController.removeMapping);

module.exports = router;
