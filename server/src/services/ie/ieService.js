const db = require('../../config/db');
const OrderRepo = require('../../repositories/it/orderRepo');
const MasterRepo = require('../../repositories/it/masterRepo');
const LineRepo = require('../../repositories/ie/lineRepo');
const IERepo = require('../../repositories/ie/ieRepo');
const OperationRepo = require('../../repositories/ie/operationRepo');
const MultiWorkRepo = require('../../repositories/ie/multiWorkRepo');

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

    async createBatchOperations(sizeCategoryId, operations, user) {
        const tableName = await this._resolveTable(sizeCategoryId);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const results = [];
            for (const operation of operations) {
                const payload = {
                    ...operation,
                    created_by: user.employeeId,
                    last_changed_by: user.employeeId
                };

                const op = await OperationRepo.createOperation(client, tableName, payload);
                results.push(op);
            }

            await client.query('COMMIT');
            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async createBatchOperationsForCategory(sizeCategoryId, operations, user) {
        // Get size category details and all associated sizes
        const sizeCat = await MasterRepo.getSizeCategoryById(sizeCategoryId);
        if (!sizeCat) throw new Error("Invalid size category");

        const sizes = sizeCat.sizes.split(',').map(s => s.trim()).filter(s => s);
        if (sizes.length === 0) throw new Error("No sizes found in this category");

        const tableName = await this._resolveTable(sizeCategoryId);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const results = [];

            // For each operation, create entries for ALL sizes in category
            for (const operation of operations) {
                for (const size of sizes) {
                    const payload = {
                        style_id: operation.style_id,
                        operation_name: operation.operation_name.trim(),
                        operation_sequence: parseInt(operation.operation_sequence),
                        cutting_part_no: operation.cutting_part_no ? parseInt(operation.cutting_part_no) : null,
                        machine_type: operation.machine_type.trim(),
                        sam: parseFloat(operation.sam),
                        created_by: user.employeeId,
                        last_changed_by: user.employeeId,
                        // Add size-specific column value
                        [size.toLowerCase()]: null // Size column starts as null, can be populated later
                    };

                    const op = await OperationRepo.createOperation(client, tableName, payload);
                    results.push(op);
                }
            }

            await client.query('COMMIT');
            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async createBatchOperationsForStyle(styleId, operations, user) {
        if (!styleId) throw new Error("Style ID is required");
        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            throw new Error("No operations provided");
        }

        // 1. Find all size categories for this style from orders table
        const { rows: categories } = await db.query(`
            SELECT DISTINCT sc.size_category_id, sc.size_category_name, sc.sizes
            FROM orders o
            JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.style_id = $1
        `, [styleId]);

        if (categories.length === 0) {
            throw new Error(`Style ${styleId} not found in any orders or associated size categories. Please ensure orders are created first.`);
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const results = [];

            // For each relevant size category, apply operations once per table
            for (const category of categories) {
                const tableName = MasterRepo.getSamSeamTableName(category.size_category_name);

                for (const op of operations) {
                    // VALIDATION: Prevent duplicate sequence numbers within the same style/table
                    const dupCheck = await client.query(`
                        SELECT 1 FROM "${tableName}" 
                        WHERE style_id = $1 AND operation_sequence = $2
                    `, [styleId, op.operation_sequence]);

                    if (dupCheck.rowCount > 0) {
                        throw new Error(`Sequence ${op.operation_sequence} already exists for style ${styleId} in category ${category.size_category_name}`);
                    }

                    const payload = {
                        style_id: styleId,
                        operation_name: op.operation_name.trim(),
                        operation_sequence: parseInt(op.operation_sequence),
                        cutting_part_no: op.cutting_part_no ? parseInt(op.cutting_part_no) : null,
                        machine_type: op.machine_type ? op.machine_type.trim() : null,
                        sam: parseFloat(op.sam),
                        created_by: user.employeeId,
                        last_changed_by: user.employeeId
                    };

                    const createdOp = await OperationRepo.createOperation(client, tableName, payload);
                    results.push(createdOp);
                }
            }

            await client.query('COMMIT');
            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getOperationsByStyle(styleId) {
        if (!styleId) throw new Error("Style ID is required");

        // 1. Find the first size category that has this style in orders
        const { rows: categories } = await db.query(`
            SELECT DISTINCT sc.size_category_name
            FROM orders o
            JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.style_id = $1
            LIMIT 1
        `, [styleId]);

        if (categories.length === 0) return [];

        const tableName = MasterRepo.getSamSeamTableName(categories[0].size_category_name);

        // 2. Fetch operations from that table
        return await OperationRepo.getOperations(tableName, styleId);
    }

    async updateOperationsByStyle(styleId, oldSequence, data, user) {
        if (!styleId) throw new Error("Style ID is required");
        if (!oldSequence) throw new Error("Old sequence number is required");

        // 1. Find all size categories for this style
        const { rows: categories } = await db.query(`
            SELECT DISTINCT sc.size_category_id, sc.size_category_name
            FROM orders o
            JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.style_id = $1
        `, [styleId]);

        if (categories.length === 0) {
            throw new Error(`Style ${styleId} not found in any orders.`);
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const newSequence = data.operation_sequence ? parseInt(data.operation_sequence) : parseInt(oldSequence);
            const results = [];

            for (const category of categories) {
                const tableName = MasterRepo.getSamSeamTableName(category.size_category_name);

                // VALIDATION: If sequence is changing, check for conflicts
                if (parseInt(oldSequence) !== newSequence) {
                    const dupCheck = await client.query(`
                        SELECT 1 FROM "${tableName}" 
                        WHERE style_id = $1 AND operation_sequence = $2
                    `, [styleId, newSequence]);

                    if (dupCheck.rowCount > 0) {
                        throw new Error(`Conflict: Sequence ${newSequence} already exists for style ${styleId} in category ${category.size_category_name}`);
                    }
                }

                // Update using style_id and oldSequence as key
                const payload = {
                    operation_name: data.operation_name,
                    operation_sequence: newSequence,
                    cutting_part_no: data.cutting_part_no ? parseInt(data.cutting_part_no) : null,
                    machine_type: data.machine_type,
                    sam: data.sam ? parseFloat(data.sam) : 0,
                    last_changed_by: user.employeeId
                };

                const updateQuery = `
                    UPDATE "${tableName}" 
                    SET 
                        operation_name = COALESCE($1, operation_name),
                        operation_sequence = COALESCE($2, operation_sequence),
                        cutting_part_no = $3,
                        machine_type = COALESCE($4, machine_type),
                        sam = COALESCE($5, sam),
                        last_changed_by = $6,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE style_id = $7 AND operation_sequence = $8
                    RETURNING *
                `;

                const { rows } = await client.query(updateQuery, [
                    payload.operation_name,
                    payload.operation_sequence,
                    payload.cutting_part_no,
                    payload.machine_type,
                    payload.sam,
                    payload.last_changed_by,
                    styleId,
                    parseInt(oldSequence)
                ]);

                if (rows.length > 0) {
                    results.push(rows[0]);
                }
            }

            if (results.length === 0) {
                throw new Error("No operations were updated. Ensure the sequence number is correct.");
            }

            await client.query('COMMIT');
            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteOperationsByStyle(styleId, sequence, user) {
        if (!styleId || !sequence) throw new Error("Style ID and Sequence are required");

        const { rows: categories } = await db.query(`
            SELECT DISTINCT sc.size_category_name
            FROM orders o
            JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE o.style_id = $1
        `, [styleId]);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const category of categories) {
                const tableName = MasterRepo.getSamSeamTableName(category.size_category_name);
                await client.query(`DELETE FROM "${tableName}" WHERE style_id = $1 AND operation_sequence = $2`, [styleId, sequence]);
            }
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
            SELECT e.emp_id, e.name, e.status, deg.designation_name, 
                   CASE 
                     WHEN e.working_line_no = 0 THEN (
                        SELECT string_agg(l2.line_name, ', ') 
                        FROM lines l2 
                        WHERE l2.line_no = ANY(mw.multi_lines)
                     )
                     ELSE l.line_name 
                   END as line_name,
                   e.working_line_no, d.department_name
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            LEFT JOIN lines l ON e.working_line_no = l.line_no
            LEFT JOIN multi_work mw ON e.emp_id = mw.emp_id
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

    async _syncLineStaff(lineNo, supervisorIds = [], ieIds = [], qcIds = [], feedingHelperIds = [], mechanicId = null) {
        // Collect all unique employee IDs
        const allEmpIds = [...new Set([
            ...(Array.isArray(supervisorIds) ? supervisorIds : [supervisorIds]),
            ...(Array.isArray(ieIds) ? ieIds : [ieIds]),
            ...(Array.isArray(qcIds) ? qcIds : [qcIds]),
            ...(Array.isArray(feedingHelperIds) ? feedingHelperIds : [feedingHelperIds]),
            mechanicId
        ].filter(id => id && id.length > 0))];

        for (const empId of allEmpIds) {
            try {
                // Get current assignment
                const { rows } = await db.query("SELECT working_line_no FROM employees WHERE emp_id = $1", [empId]);
                const currentLine = rows[0]?.working_line_no;

                if (currentLine !== null && currentLine !== 0 && currentLine !== parseInt(lineNo)) {
                    // Already on ONE other line -> Upgrade to Multi
                    await this.updateEmployeeWork(empId, { lineNo: [currentLine, parseInt(lineNo)] });
                } else if (currentLine === 0) {
                    // Already in Multi-work -> Add this line to the list
                    const multi = await MultiWorkRepo.getMultiWorkByEmpId(null, empId);
                    const lines = [...new Set([...(multi?.multi_lines || []), parseInt(lineNo)])];
                    await this.updateEmployeeWork(empId, { lineNo: lines });
                } else {
                    // Singular assignment to this line or unassigned
                    await db.query("UPDATE employees SET working_line_no = $1 WHERE emp_id = $2", [lineNo, empId]);
                }
            } catch (e) {
                console.error(`Sync failed for employee ${empId}:`, e);
            }
        }
    }

    async createLine(data) {
        const existing = await LineRepo.getLineByNo(data.line_no);
        if (existing) throw new Error(`Line No ${data.line_no} already exists`);

        // Prepare line data for Repo (storing only first ID for multi-select roles)
        const linePayload = {
            ...data,
            line_supervisor_id: Array.isArray(data.line_supervisor_id) ? data.line_supervisor_id[0] : data.line_supervisor_id,
            line_ie_id: Array.isArray(data.line_ie_id) ? data.line_ie_id[0] : data.line_ie_id,
            line_qc_id: Array.isArray(data.line_qc_id) ? data.line_qc_id[0] : data.line_qc_id,
            line_feeding_helper_id: Array.isArray(data.line_feeding_helper_id) ? data.line_feeding_helper_id[0] : data.line_feeding_helper_id
        };

        const line = await LineRepo.createLine(linePayload);

        // Sync ALL selected employees' line numbers
        await this._syncLineStaff(
            line.line_no,
            data.line_supervisor_id,
            data.line_ie_id,
            data.line_qc_id,
            data.line_feeding_helper_id,
            data.line_mechanic_id
        );

        return line;
    }

    async updateLine(lineNo, data) {
        const current = await LineRepo.getLineByNo(lineNo);
        if (!current) throw new Error("Line not found");

        // Prepare line data for Repo (storing only first ID for multi-select roles)
        const updateData = {
            line_name: data.line_name || current.line_name,
            block_id: data.block_id !== undefined ? data.block_id : current.block_id,
            running_style_id: data.running_style_id !== undefined ? data.running_style_id : current.running_style_id,
            no_of_manpower: data.no_of_manpower !== undefined ? data.no_of_manpower : current.no_of_manpower,
            no_of_machines: data.no_of_machines !== undefined ? data.no_of_machines : current.no_of_machines,
            status: data.status || current.status,
            line_supervisor_id: Array.isArray(data.line_supervisor_id) ? data.line_supervisor_id[0] : (data.line_supervisor_id !== undefined ? data.line_supervisor_id : current.line_supervisor_id),
            line_ie_id: Array.isArray(data.line_ie_id) ? data.line_ie_id[0] : (data.line_ie_id !== undefined ? data.line_ie_id : current.line_ie_id),
            line_qc_id: Array.isArray(data.line_qc_id) ? data.line_qc_id[0] : (data.line_qc_id !== undefined ? data.line_qc_id : current.line_qc_id),
            line_feeding_helper_id: Array.isArray(data.line_feeding_helper_id) ? data.line_feeding_helper_id[0] : (data.line_feeding_helper_id !== undefined ? data.line_feeding_helper_id : current.line_feeding_helper_id),
            line_mechanic_id: data.line_mechanic_id !== undefined ? data.line_mechanic_id : current.line_mechanic_id
        };

        const updated = await LineRepo.updateLine(lineNo, updateData);

        // Sync ALL selected employees' line numbers
        await this._syncLineStaff(
            lineNo,
            data.line_supervisor_id,
            data.line_ie_id,
            data.line_qc_id,
            data.line_feeding_helper_id,
            data.line_mechanic_id
        );

        return updated;
    }

    async designateLineRole(lineNo, { role, empId }) {
        const allowedRoles = ['line_supervisor_id', 'line_ie_id', 'line_qc_id', 'line_feeding_helper_id', 'line_mechanic_id'];
        if (!allowedRoles.includes(role)) throw new Error("Invalid management role");

        // empId can be an array here if UI starts using this for multi-select too
        const primaryId = Array.isArray(empId) ? empId[0] : empId;
        const updated = await LineRepo.updateLine(lineNo, { [role]: primaryId });

        if (empId) {
            const ids = Array.isArray(empId) ? empId : [empId];
            await db.query("UPDATE employees SET working_line_no = $1 WHERE emp_id = ANY($2)", [lineNo, ids]);
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
        const prodDept = await db.query("SELECT department_id FROM departments WHERE (lower(department_name) = 'production') LIMIT 1");
        if (prodDept.rowCount === 0) throw new Error("Production department master entry missing");

        const deptId = prodDept.rows[0].department_id;
        const minLevel = 7; // Floor staff are level 10 (Operator/Tailor), helpers are 7. "Above 7" targets 10.

        return await IERepo.getAllocatableStaff(deptId, minLevel);
    }

    async assignEmployeesToLine(lineNo, employeeIds) {
        const line = await LineRepo.getLineByNo(lineNo);
        if (!line) throw new Error(`Line ${lineNo} not found`);
        return await IERepo.assignEmployeesToLine(lineNo, employeeIds);
    }

    async unassignEmployees(employeeIds) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const results = await IERepo.unassignEmployees(employeeIds);
            // Also clear multi-work records for these employees
            if (employeeIds && employeeIds.length > 0) {
                await client.query('DELETE FROM multi_work WHERE emp_id = ANY($1)', [employeeIds]);
            }
            await client.query('COMMIT');
            return results;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async updateEmployeeWork(empId, workData) {
        // 1. Get Employee Designation Level
        const empRes = await db.query(`
            SELECT e.working_line_no, e.department_id, d.designation_level 
            FROM employees e 
            JOIN designations d ON e.designation_id = d.designation_id 
            WHERE e.emp_id = $1
        `, [empId]);
        const emp = empRes.rows[0];
        if (!emp) throw new Error("Employee not found");

        const lineNos = Array.isArray(workData.lineNo) ? workData.lineNo : (workData.lineNo ? [workData.lineNo] : null);
        const operationIds = Array.isArray(workData.operationId) ? workData.operationId : (workData.operationId ? [workData.operationId] : null);

        // 2. Validate Eligibility
        const isMultiLine = lineNos && lineNos.length > 1;
        const isMultiOp = operationIds && operationIds.length > 1;

        if (isMultiLine && emp.designation_level === null) {
            // Fallback if level is missing, but usually it should be there.
        }

        // Rule: All levels can do multi-line? 
        // "Employees with designation level below 7: Can work in MULTIPLE LINES."
        // "Employees with designation level 7 and above: MULTIPLE OPERATIONS AND MULTIPLE LINES."
        // Wait, "below 7" (1-6) can do lines. "7 and above" (7-10) can do both.
        // So BOTH can do multi-line.

        if (isMultiOp && emp.designation_level < 7) {
            throw new Error(`Employees with designation level ${emp.designation_level} are not eligible for multiple operations. Minimum level 7 required.`);
        }

        // 3. Resolve Primary Table Value (0 for multi)
        const primaryLineNo = isMultiLine ? 0 : (lineNos ? lineNos[0] : emp.working_line_no);
        const primaryOpId = isMultiOp ? 0 : (operationIds ? operationIds[0] : null);

        // 4. Validate operations if provided
        if (operationIds && operationIds.length > 0) {
            // ... validation logic (simplified for multi or use first if same line) ...
            // For now, keep existing single validation if single op
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const allowedData = {
                operationId: primaryOpId,
                shiftNo: workData.shiftNo,
                workStage: workData.workStage,
                dailyTarget: workData.dailyTarget
            };

            // Update Primary Table
            const updated = await IERepo.updateWorkDetails(empId, allowedData);
            if (!updated) throw new Error("Employee update failed");

            // If any is multi, or we want to update the multi_work entry anyway
            if (isMultiLine || isMultiOp) {
                await MultiWorkRepo.upsertMultiWork(client, {
                    empId,
                    multiLines: lineNos,
                    multiOperations: operationIds
                });
            } else {
                // If transitioning back to single, clear multi record?
                // Requirement: "One employee = one record in multi_work. Updates must overwrite cleanly."
                // I'll keep the record but with singular values OR delete it.
                // Better to keep it updated with current state if we want to track history, 
                // but usually, we just delete or update to empty arrays.
                await MultiWorkRepo.deleteMultiWork(client, empId);
            }

            // Sync line number in employees table if it changed
            if (lineNos) {
                await client.query("UPDATE employees SET working_line_no = $1 WHERE emp_id = $2", [primaryLineNo, empId]);
            }

            await client.query('COMMIT');
            return updated;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
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

        // 1. Fetch styles for which CUTTING HAS STARTED
        const styles = await db.query(`
            SELECT DISTINCT o.style_id, sm.style_name 
            FROM orders o 
            LEFT JOIN style_master sm ON o.style_id = sm.style_id 
            WHERE o.style_id IN (SELECT DISTINCT style_id FROM cutting)
            ORDER BY o.style_id ASC
        `);

        // 2. Fetch categorized employees for role selection
        // Roles: Supervisor (Prod/Supervisor), IE (IE Dept), QC (Quality Dept), Feeding Helper (Prod Dept)
        const employees = await db.query(`
            SELECT e.emp_id, e.name, e.department_id, e.designation_id, deg.designation_name, e.working_line_no
            FROM employees e
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            WHERE e.status = 'ACTIVE' 
              AND e.department_id IN (1, 2, 4)
            ORDER BY e.name ASC
        `);

        // Categorize for frontend efficiency
        const roleStaff = {
            supervisors: employees.rows.filter(e => e.department_id === 1 && e.designation_id === 2),
            ie: employees.rows.filter(e => e.department_id === 4),
            qc: employees.rows.filter(e => e.department_id === 2),
            feedingHelpers: employees.rows.filter(e => e.department_id === 1 && e.designation_id === 10),
            mechanics: []
        };

        // Re-fetch mechanics specifically if needed
        const mechanics = await db.query(`
            SELECT e.emp_id, e.name, deg.designation_name, e.working_line_no
            FROM employees e
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            WHERE e.status = 'ACTIVE' AND e.department_id = 3
        `);
        roleStaff.mechanics = mechanics.rows;

        const sizeCategories = await MasterRepo.getAllSizeCategories();

        return {
            shifts,
            styles: styles.rows,
            sizeCategories,
            roleStaff
        };
    }
}

module.exports = new IEService();
