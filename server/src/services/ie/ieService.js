const db = require('../../config/db');
const OrderRepo = require('../../repositories/it/orderRepo');
const MasterRepo = require('../../repositories/it/masterRepo');
const LineRepo = require('../../repositories/ie/lineRepo');
const IERepo = require('../../repositories/ie/ieRepo');
const OperationRepo = require('../../repositories/ie/operationRepo');

class IEService {

    // --- OPERATIONS MANAGEMENT (DYNAMIC TABLES) ---

    async _resolveTable(sizeCategoryId) {
        if (!sizeCategoryId) throw new Error("Size category is mandatory");
        const sizeCat = await MasterRepo.getSizeCategoryById(sizeCategoryId);
        if (!sizeCat) throw new Error("Invalid size category");
        return MasterRepo.getSamSeamTableName(sizeCat.size_category_name);
    }

    async getOperations(sizeCategoryId, styleId) {
        if (!styleId) throw new Error("Style ID is required");
        const tableName = await this._resolveTable(sizeCategoryId);
        return await OperationRepo.getOperations(tableName, styleId);
    }

    async createOperation(sizeCategoryId, data, user) {
        const tableName = await this._resolveTable(sizeCategoryId);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const payload = {
                ...data,
                created_by: user.employeeId,
                last_changed_by: user.employeeId
            };
            // Clean payload of non-db fields if any
            delete payload.sizeCategoryId;

            const op = await OperationRepo.createOperation(client, tableName, payload);
            await client.query('COMMIT');
            return op;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async updateOperation(sizeCategoryId, opId, data, user) {
        const tableName = await this._resolveTable(sizeCategoryId);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await OperationRepo.getOperationById(client, tableName, opId);
            if (!existing) throw new Error("Operation not found");

            const payload = {
                ...data,
                last_changed_by: user.employeeId
            };
            delete payload.sizeCategoryId;
            delete payload.operation_id;

            const updated = await OperationRepo.updateOperation(client, tableName, opId, payload);
            await client.query('COMMIT');
            return updated;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteOperation(sizeCategoryId, opId, user) {
        const tableName = await this._resolveTable(sizeCategoryId);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await OperationRepo.getOperationById(client, tableName, opId);
            if (!existing) throw new Error("Operation not found");

            // PERMISSION CHECK (MANDATORY)
            // Allowed if: User is Creator OR user is IE_MANAGER
            const isCreator = existing.created_by === user.employeeId;
            const isIEManager = user.role === 'IE Manager'; // Contract check

            if (!isCreator && !isIEManager) {
                throw new Error("Permission Denied: Only the creator or an IE Manager can delete operations");
            }

            await OperationRepo.deleteOperation(client, tableName, opId);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // --- ORDERS (READ ONLY) ---

    async getAllOrders() {
        return await OrderRepo.getAllOrders();
    }

    async getOrderDetails(orderId) {
        const order = await OrderRepo.getOrderById(orderId);
        if (!order) throw new Error("Order not found");

        let quantities = {};
        if (order.size_category) {
            const sizeCat = await MasterRepo.getSizeCategoryById(order.size_category);
            if (sizeCat) {
                const tableName = MasterRepo.getTableNameForCategory(sizeCat.size_category_name);
                const qtyRecord = await OrderRepo.getDynamicQty(tableName, orderId);
                if (qtyRecord) {
                    const { order_id, ...qtys } = qtyRecord;
                    quantities = qtys;
                }
            }
        }

        return { ...order, quantities };
    }

    // --- EMPLOYEES ---

    async getProductionEmployees() {
        const query = `
            SELECT e.emp_id, e.name, e.status, deg.designation_name, l.line_name, e.working_line_no, d.department_name
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            LEFT JOIN lines l ON e.working_line_no = l.line_no
            WHERE d.department_id IN (1, 4)
            ORDER BY d.department_id ASC, e.name ASC
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    // --- LINE RESOURCE RESOLUTION (FINAL CONTRACT) ---

    _formatLine(data, summary) {
        return {
            lineInfo: {
                line_no: data.line_no,
                line_name: data.line_name,
                status: data.status,
                no_of_manpower: data.no_of_manpower,
                no_of_machines: data.no_of_machines
            },
            runningStyle: {
                style_id: data.running_style_id,
                style_name: data.style_name || 'No Active Style',
                brand: data.final_brand || '-',
                colour: data.color_name || '-',
                size_category: data.size_category_name || '-'
            },
            responsiblePersons: {
                supervisor: data.supervisor_name ? {
                    id: data.line_supervisor_id,
                    name: data.supervisor_name,
                    designation: data.supervisor_designation
                } : null,
                ie: data.ie_name ? {
                    id: data.line_ie_id,
                    name: data.ie_name,
                    designation: data.ie_designation
                } : null,
                qc: data.qc_name ? {
                    id: data.line_qc_id,
                    name: data.qc_name,
                    designation: data.qc_designation
                } : null,
                feedingHelper: data.feeding_helper_name ? {
                    id: data.line_feeding_helper_id,
                    name: data.feeding_helper_name,
                    designation: data.feeding_helper_designation
                } : null,
                mechanic: data.mechanic_name ? {
                    id: data.line_mechanic_id,
                    name: data.mechanic_name,
                    designation: data.mechanic_designation
                } : null
            },
            manpowerSummary: summary || []
        };
    }

    async getAllLines() {
        const lines = await LineRepo.getAllLines();
        return await Promise.all(lines.map(async (line) => {
            const summary = await LineRepo.getLineManpowerSummary(line.line_no);
            return this._formatLine(line, summary);
        }));
    }

    async getLineDetails(lineNo) {
        const lines = await LineRepo.getAllLines(); // Use getAllLines logic to get enriched row
        const line = lines.find(l => l.line_no == lineNo);
        if (!line) throw new Error("Line not found");
        const summary = await LineRepo.getLineManpowerSummary(lineNo);
        return this._formatLine(line, summary);
    }

    async getLineManpowerDetail(lineNo) {
        const lines = await LineRepo.getAllLines();
        const line = lines.find(l => l.line_no == lineNo);
        if (!line) throw new Error("Line not found");

        const sizeCategory = line.size_category_name;
        const styleId = line.running_style_id;

        let operationsTable = null;
        if (sizeCategory && sizeCategory !== '-') {
            const potentialTable = `size_${sizeCategory.toLowerCase().replace(/[^a-z0-9_]/g, '')}_op_sam_seam`;
            const check = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [potentialTable]);
            if (check.rows[0].exists) operationsTable = potentialTable;
        }

        const employees = await LineRepo.getLineEmployeesFull(lineNo, operationsTable, styleId);
        const summary = await LineRepo.getLineManpowerSummary(lineNo);
        return { line_no: line.line_no, line_name: line.line_name, summary, employees, operationsTable };
    }

    async getLineOperations(lineNo) {
        const lines = await LineRepo.getAllLines();
        const line = lines.find(l => l.line_no == lineNo);
        if (!line) throw new Error("Line not found");

        const sizeCategory = line.size_category_name;
        const styleId = line.running_style_id;

        if (!styleId || !sizeCategory || sizeCategory === '-') return [];

        const tableName = `size_${sizeCategory.toLowerCase().replace(/[^a-z0-9_]/g, '')}_op_sam_seam`;
        const check = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [tableName]);

        if (!check.rows[0].exists) return [];

        return await LineRepo.getOperationsByStyleTable(tableName, styleId);
    }

    // --- LINES (CRUD + SYNC) ---

    async _syncLineStaff(lineNo, data) {
        const rpIds = [
            data.line_supervisor_id,
            data.line_ie_id,
            data.line_qc_id,
            data.line_feeding_helper_id,
            data.line_mechanic_id
        ].filter(id => id && id.length > 0);

        if (rpIds.length > 0) {
            await db.query(
                "UPDATE employees SET working_line_no = $1 WHERE emp_id = ANY($2)",
                [lineNo, rpIds]
            );
        }
    }

    async createLine(data) {
        const existing = await LineRepo.getLineByNo(data.line_no);
        if (existing) throw new Error(`Line No ${data.line_no} already exists`);
        const line = await LineRepo.createLine(data);
        await this._syncLineStaff(line.line_no, data);
        return line;
    }

    async updateLine(lineNo, data) {
        const current = await LineRepo.getLineByNo(lineNo);
        if (!current) throw new Error("Line not found");

        const updateData = {
            line_name: data.line_name || current.line_name,
            block_id: data.block_id !== undefined ? data.block_id : current.block_id,
            running_style_id: data.running_style_id !== undefined ? data.running_style_id : current.running_style_id,
            no_of_manpower: data.no_of_manpower !== undefined ? data.no_of_manpower : current.no_of_manpower,
            no_of_machines: data.no_of_machines !== undefined ? data.no_of_machines : current.no_of_machines,
            status: data.status || current.status,
            line_supervisor_id: data.line_supervisor_id !== undefined ? data.line_supervisor_id : current.line_supervisor_id,
            line_ie_id: data.line_ie_id !== undefined ? data.line_ie_id : current.line_ie_id,
            line_qc_id: data.line_qc_id !== undefined ? data.line_qc_id : current.line_qc_id,
            line_feeding_helper_id: data.line_feeding_helper_id !== undefined ? data.line_feeding_helper_id : current.line_feeding_helper_id,
            line_mechanic_id: data.line_mechanic_id !== undefined ? data.line_mechanic_id : current.line_mechanic_id
        };

        const updated = await LineRepo.updateLine(lineNo, updateData);
        await this._syncLineStaff(lineNo, updateData);
        return updated;
    }

    async designateLineRole(lineNo, { role, empId }) {
        const allowedRoles = ['line_supervisor_id', 'line_ie_id', 'line_qc_id', 'line_feeding_helper_id', 'line_mechanic_id'];
        if (!allowedRoles.includes(role)) throw new Error("Invalid management role");
        const updated = await LineRepo.updateLine(lineNo, { [role]: empId });
        if (empId) {
            await db.query("UPDATE employees SET working_line_no = $1 WHERE emp_id = $2", [lineNo, empId]);
        }
        return updated;
    }

    async deleteLine(lineNo) {
        return await LineRepo.deleteLine(lineNo);
    }

    // --- STAFF ---

    async getEmployeesByLine(lineNo) {
        return await IERepo.getEmployeesByLine(lineNo);
    }

    async getUnassignedProductionStaff() {
        return await IERepo.getUnassignedStaffForIE();
    }

    async assignEmployeesToLine(lineNo, employeeIds) {
        const line = await LineRepo.getLineByNo(lineNo);
        if (!line) throw new Error(`Line ${lineNo} not found`);
        return await IERepo.assignEmployeesToLine(lineNo, employeeIds);
    }

    async unassignEmployees(employeeIds) {
        return await IERepo.unassignEmployees(employeeIds);
    }

    async updateEmployeeWork(empId, workData) {
        // Need to validate operationId if provided
        if (workData.operationId) {
            // Get employee's current line to resolve style and table
            const empRes = await db.query("SELECT working_line_no, department_id FROM employees WHERE emp_id = $1", [empId]);
            const emp = empRes.rows[0];
            if (!emp || !emp.working_line_no) throw new Error("Employee must be assigned to a line to receive an operation");
            if (![1, 4].includes(emp.department_id)) throw new Error("Only Production and IE personnel can be assigned operations");

            const lines = await LineRepo.getAllLines();
            const line = lines.find(l => l.line_no == emp.working_line_no);

            if (!line || !line.running_style_id) throw new Error("Line has no active running style");

            const sizeCategory = line.size_category_name;
            if (!sizeCategory || sizeCategory === '-') throw new Error("Running style has no size category");

            const tableName = `size_${sizeCategory.toLowerCase().replace(/[^a-z0-9_]/g, '')}_op_sam_seam`;
            const check = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [tableName]);
            if (!check.rows[0].exists) throw new Error(`Operation table ${tableName} not found`);

            // Check if operation exists in this specific style/table
            const opCheck = await db.query(`SELECT 1 FROM ${tableName} WHERE operation_id = $1 AND style_id = $2`, [workData.operationId, line.running_style_id]);
            if (opCheck.rowCount === 0) throw new Error("Invalid operation for the current running style");
        }

        const allowedData = {
            operationId: workData.operationId,
            shiftNo: workData.shiftNo,
            workStage: workData.workStage,
            dailyTarget: workData.dailyTarget
        };
        const updated = await IERepo.updateWorkDetails(empId, allowedData);
        if (!updated) throw new Error("Employee update failed");
        return updated;
    }

    async getStaffPool() {
        const query = `
            SELECT e.emp_id, e.name, d.department_name, deg.designation_name
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            WHERE e.status = 'ACTIVE'
            ORDER BY e.name ASC
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    async getIEMasters() {
        const shifts = await IERepo.getAllShifts();
        const styles = await db.query("SELECT style_id, style_name, brand FROM style_master ORDER BY style_name ASC");
        const sizeCategories = await MasterRepo.getAllSizeCategories();
        return { shifts, styles: styles.rows, sizeCategories };
    }
}

module.exports = new IEService();
