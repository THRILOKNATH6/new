const HRService = require('../../../services/hr/hrService');

class HRController {
    // --- Employees ---

    async createEmployee(req, res) {
        try {
            // Basic Validation could be here or Joi
            const result = await HRService.createEmployee(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            // Handle unique constraint errors if ID generation collides (rare but possible)
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateEmployee(req, res) {
        try {
            const result = await HRService.updateEmployee(req.params.empId, req.body);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getEmployees(req, res) {
        try {
            const data = await HRService.getEmployees();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    // --- Masters ---

    async createDepartment(req, res) {
        try {
            const result = await HRService.createDepartment(req.body.name);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getDepartments(req, res) {
        try {
            const data = await HRService.getDepartments();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async createDesignation(req, res) {
        try {
            const { name, level } = req.body;
            const result = await HRService.createDesignation(name, level);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getDesignations(req, res) {
        try {
            const data = await HRService.getDesignations();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    // --- Mappings ---

    async getMapping(req, res) {
        try {
            const data = await HRService.getMapping();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getDesignationsByDept(req, res) {
        try {
            const data = await HRService.getDesignationsByDept(req.params.deptId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async addMapping(req, res) {
        try {
            const { departmentId, designationId } = req.body;
            const result = await HRService.addMapping(departmentId, designationId);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async removeMapping(req, res) {
        try {
            const { departmentId, designationId } = req.params;
            await HRService.removeMapping(departmentId, designationId);
            res.json({ success: true, message: 'Mapping removed' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new HRController();
