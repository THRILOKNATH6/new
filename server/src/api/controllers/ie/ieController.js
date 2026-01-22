const IEService = require('../../../services/ie/ieService');

class IEController {

    async getOrders(req, res) {
        try {
            const data = await IEService.getAllOrders();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getOrderDetails(req, res) {
        try {
            const data = await IEService.getOrderDetails(req.params.id);
            res.json({ success: true, data });
        } catch (err) {
            res.status(404).json({ success: false, message: err.message });
        }
    }

    async getProductionEmployees(req, res) {
        try {
            const data = await IEService.getProductionEmployees();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    // --- LINES (CONTRACT MATCHED) ---

    async getLines(req, res) {
        try {
            const data = await IEService.getAllLines();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getLineDetails(req, res) {
        try {
            const data = await IEService.getLineDetails(req.params.id);
            res.json({ success: true, data });
        } catch (err) {
            res.status(err.message === "Line not found" ? 404 : 500).json({ success: false, message: err.message });
        }
    }

    async createLine(req, res) {
        try {
            const result = await IEService.createLine(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateLine(req, res) {
        try {
            const result = await IEService.updateLine(req.params.id, req.body);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async designateRole(req, res) {
        try {
            const result = await IEService.designateLineRole(req.params.id, req.body);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async deleteLine(req, res) {
        try {
            const result = await IEService.deleteLine(req.params.id);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    // --- STAFF & MANPOWER ---

    async getLineStaff(req, res) {
        try {
            const data = await IEService.getEmployeesByLine(req.params.lineNo);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getLineManpowerDetail(req, res) {
        try {
            const data = await IEService.getLineManpowerDetail(req.params.lineNo);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getUnassignedStaff(req, res) {
        try {
            const data = await IEService.getUnassignedProductionStaff();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async assignStaff(req, res) {
        try {
            const { lineNo, employeeIds } = req.body;
            const data = await IEService.assignEmployeesToLine(lineNo, employeeIds);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async unassignStaff(req, res) {
        try {
            const { employeeIds } = req.body;
            const data = await IEService.unassignEmployees(employeeIds);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateWork(req, res) {
        try {
            const data = await IEService.updateEmployeeWork(req.params.empId, req.body);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async getLineOperations(req, res) {
        try {
            const data = await IEService.getLineOperations(req.params.lineNo);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getStaffPool(req, res) {
        try {
            const data = await IEService.getStaffPool();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getMasters(req, res) {
        try {
            const data = await IEService.getIEMasters();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    // --- OPERATIONS MANAGEMENT ---

    async getOperations(req, res) {
        try {
            const { sizeCategoryId, styleId } = req.query;
            const data = await IEService.getOperations(sizeCategoryId, styleId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async createOperation(req, res) {
        try {
            const { sizeCategoryId } = req.body;
            const data = await IEService.createOperation(sizeCategoryId, req.body, req.user);
            res.status(201).json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateOperation(req, res) {
        try {
            const { sizeCategoryId } = req.body;
            const opId = req.params.opId;
            const data = await IEService.updateOperation(sizeCategoryId, opId, req.body, req.user);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async deleteOperation(req, res) {
        try {
            const { sizeCategoryId } = req.query;
            const opId = req.params.opId;
            await IEService.deleteOperation(sizeCategoryId, opId, req.user);
            res.json({ success: true, message: 'Operation deleted' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new IEController();
