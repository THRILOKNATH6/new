const HRRepo = require('../../repositories/hr/hrRepo');

class HRService {
    // Helper to generate IDs
    generateIds(name) {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 1000);
        // Realistic format: EMP-202X-Random
        const empId = `EMP-${new Date().getFullYear()}-${random}`;
        const qrId = `QR-${empId}`;
        const tokenNo = `T-${random}`;
        return { empId, qrId, tokenNo };
    }

    async createEmployee(data) {
        // 1. Generate System Identifiers (Backend Controlled)
        const ids = this.generateIds(data.name);

        // 2. Prepare Payload
        const employeeData = {
            ...ids,
            name: data.name,
            address: data.address,
            gender: data.gender,
            dateOfJoin: data.dateOfJoin,
            salary: data.salary || 0,
            designationId: data.designationId,
            departmentId: data.departmentId,
            blockId: data.blockId || null,
            shiftNo: data.shiftNo || 1
        };

        // 3. System-Level Validation (Mapping Enforcement)
        const isAllowed = await HRRepo.checkMappingExists(data.departmentId, data.designationId);
        if (!isAllowed) {
            throw new Error('Designation violation: The selected designation is not allowed in this department.');
        }

        // 4. Persist
        return await HRRepo.createEmployee(employeeData);
    }

    async updateEmployee(empId, updateData) {
        // 1. Check Existence
        const exists = await HRRepo.getEmployeeById(empId);
        if (!exists) throw new Error('Employee not found');

        // 2. Whitelist Fields (Strict Security)
        // We do NOT include emp_id, qr_id, token_no here.
        const allowedUpdates = {};
        if (updateData.name) allowedUpdates.name = updateData.name;
        if (updateData.address) allowedUpdates.address = updateData.address;
        if (updateData.salary) allowedUpdates.salary = updateData.salary;
        if (updateData.designationId) allowedUpdates.designation_id = updateData.designationId;
        if (updateData.departmentId) allowedUpdates.department_id = updateData.departmentId;
        if (updateData.status) allowedUpdates.status = updateData.status;

        if (Object.keys(allowedUpdates).length === 0) {
            throw new Error('No valid fields to update');
        }

        // 3. Validation if dept or desig changes
        const deptId = updateData.departmentId || exists.department_id;
        const desigId = updateData.designationId || exists.designation_id;

        if (updateData.departmentId || updateData.designationId) {
            const isAllowed = await HRRepo.checkMappingExists(deptId, desigId);
            if (!isAllowed) {
                throw new Error('Designation violation: Mapping update would result in unauthorized designation for this department.');
            }
        }

        return await HRRepo.updateEmployee(empId, allowedUpdates);
    }

    async getEmployees() {
        return await HRRepo.getAllEmployees();
    }

    // --- Masters ---

    async createDepartment(name) {
        // Validation: No duplicates
        if (!name) throw new Error('Department name is required');
        const existing = await HRRepo.findDepartmentByName(name);
        if (existing) throw new Error(`Department '${name}' already exists`);

        return await HRRepo.createDepartment(name);
    }

    async getDepartments() {
        return await HRRepo.getAllDepartments();
    }

    async createDesignation(name, level) {
        // Validation: No duplicates
        if (!name) throw new Error('Designation name is required');
        const existing = await HRRepo.findDesignationByName(name);
        if (existing) throw new Error(`Designation '${name}' already exists`);

        return await HRRepo.createDesignation(name, level);
    }

    async getDesignations() {
        return await HRRepo.getAllDesignations();
    }

    // --- Mapping Logic ---

    async getMapping() {
        return await HRRepo.getFullMapping();
    }

    async getDesignationsByDept(deptId) {
        return await HRRepo.getDesignationsByDepartment(deptId);
    }

    async addMapping(deptId, desigId) {
        return await HRRepo.addDesignationToDepartment(deptId, desigId);
    }

    async removeMapping(deptId, desigId) {
        return await HRRepo.removeDesignationFromDepartment(deptId, desigId);
    }
}

module.exports = new HRService();
