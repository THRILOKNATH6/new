const db = require('../../config/db');

class IERepository {
    // --- STAFF MANAGEMENT ---

    async getEmployeesByLine(lineNo) {
        const query = `
            SELECT e.emp_id, e.name, e.status, deg.designation_name, om.operation_name, 
                   e.assigned_operation_id, e.shift_no, e.work_stage, e.daily_target
            FROM employees e
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            LEFT JOIN operation_master om ON e.assigned_operation_id = om.operation_id
            WHERE (e.working_line_no = $1 OR (e.working_line_no = 0 AND EXISTS (SELECT 1 FROM multi_work mw WHERE mw.emp_id = e.emp_id AND $1 = ANY(mw.multi_lines))))
              AND e.department_id IN (1, 4)
            ORDER BY e.department_id ASC, e.name ASC
        `;
        const { rows } = await db.query(query, [lineNo]);
        return rows;
    }

    async getUnassignedStaffForIE() {
        const query = `
            SELECT e.emp_id, e.name, deg.designation_name, d.department_name
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            WHERE e.working_line_no IS NULL AND e.department_id IN (1, 4) AND e.status = 'ACTIVE'
            ORDER BY e.department_id ASC, e.name ASC
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    async getAllocatableStaff(departmentId, minLevel) {
        const query = `
            SELECT e.emp_id, e.token_no, e.qr_id, e.name, deg.designation_name, e.working_line_no, e.assigned_operation_id,
                   CASE WHEN e.working_line_no IS NULL AND e.assigned_operation_id IS NULL THEN 1 ELSE 0 END as is_available
            FROM employees e
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            WHERE e.department_id = $1 AND deg.designation_level > $2 AND e.status = 'ACTIVE'
            ORDER BY is_available DESC, e.name ASC
        `;
        const { rows } = await db.query(query, [departmentId, minLevel]);
        return rows;
    }

    async assignEmployeesToLine(lineNo, employeeIds) {
        // Bulk update working_line_no
        // employeeIds: Array of strings
        if (!employeeIds || employeeIds.length === 0) return [];

        const query = `
            UPDATE employees
            SET working_line_no = $1
            WHERE emp_id = ANY($2) AND department_id IN (1, 4)
            RETURNING emp_id, name, working_line_no
        `;
        const { rows } = await db.query(query, [lineNo, employeeIds]);
        return rows;
    }

    async unassignEmployees(employeeIds) {
        const query = `
            UPDATE employees
            SET working_line_no = NULL
            WHERE emp_id = ANY($1)
            RETURNING emp_id, name
        `;
        const { rows } = await db.query(query, [employeeIds]);
        return rows;
    }

    async updateWorkDetails(empId, { operationId, shiftNo, workStage, dailyTarget }) {
        const query = `
            UPDATE employees
            SET assigned_operation_id = $2,
                shift_no = COALESCE($3, shift_no),
                work_stage = COALESCE($4, work_stage),
                daily_target = COALESCE($5, daily_target)
            WHERE emp_id = $1 AND department_id IN (1, 4)
            RETURNING *
        `;
        const { rows } = await db.query(query, [empId, operationId, shiftNo, workStage, dailyTarget]);
        return rows[0];
    }

    // --- MASTERS FOR DROPDOWNS ---

    async getAllOperations() {
        const { rows } = await db.query("SELECT operation_id, operation_name FROM operation_master ORDER BY operation_name");
        return rows;
    }

    async getAllShifts() {
        const { rows } = await db.query("SELECT shift_no, shift_name FROM shifts ORDER BY shift_no");
        return rows;
    }
}

module.exports = new IERepository();
