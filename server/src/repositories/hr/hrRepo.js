const db = require('../../config/db');

class HRRepository {
    // --- Employee Management ---

    async createEmployee({ empId, qrId, tokenNo, name, address, gender, dateOfJoin, salary, designationId, departmentId, blockId, shiftNo }) {
        const query = `
            INSERT INTO employees (
                emp_id, qr_id, token_no, name, address, gender, date_of_join, salary, 
                designation_id, department_id, block_id, shift_no, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
            RETURNING *`;

        const { rows } = await db.query(query, [
            empId, qrId, tokenNo, name, address, gender, dateOfJoin, salary,
            designationId, departmentId, blockId, shiftNo
        ]);
        return rows[0];
    }

    async updateEmployee(empId, updateFields) {
        // Dynamic update query builder
        const setClause = Object.keys(updateFields)
            .map((key, idx) => `${key} = $${idx + 2}`)
            .join(', ');

        const values = [empId, ...Object.values(updateFields)];

        const query = `
            UPDATE employees 
            SET ${setClause}
            WHERE emp_id = $1
            RETURNING *`;

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    async getAllEmployees() {
        // Detailed view for HR List with conflict detection
        const query = `
            SELECT e.emp_id, e.name, e.status, e.date_of_join, e.salary, e.department_id, e.designation_id,
                   d.department_name, deg.designation_name,
                   CASE 
                     WHEN dd.department_id IS NULL THEN true 
                     ELSE false 
                   END as has_mapping_conflict
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            LEFT JOIN department_designations dd ON (e.department_id = dd.department_id AND e.designation_id = dd.designation_id)
            ORDER BY e.date_of_join DESC`;
        const { rows } = await db.query(query);
        return rows;
    }

    async getEmployeeById(empId) {
        const query = `SELECT * FROM employees WHERE emp_id = $1`;
        const { rows } = await db.query(query, [empId]);
        return rows[0];
    }

    // --- Master Data Management ---

    async findDepartmentByName(name) {
        const query = `SELECT * FROM departments WHERE LOWER(department_name) = LOWER($1)`;
        const { rows } = await db.query(query, [name]);
        return rows[0];
    }

    async createDepartment(name) {
        const query = `INSERT INTO departments (department_name) VALUES ($1) RETURNING *`;
        const { rows } = await db.query(query, [name]);
        return rows[0];
    }

    async getAllDepartments() {
        const { rows } = await db.query('SELECT * FROM departments ORDER BY department_name');
        return rows;
    }

    async findDesignationByName(name) {
        const query = `SELECT * FROM designations WHERE LOWER(designation_name) = LOWER($1)`;
        const { rows } = await db.query(query, [name]);
        return rows[0];
    }

    async createDesignation(name, level) {
        const query = `INSERT INTO designations (designation_name, designation_level) VALUES ($1, $2) RETURNING *`;
        const { rows } = await db.query(query, [name, level]);
        return rows[0];
    }

    async getAllDesignations() {
        const { rows } = await db.query('SELECT * FROM designations ORDER BY designation_level');
        return rows;
    }

    // --- Designation-Department Mapping ---

    async getDesignationsByDepartment(departmentId) {
        const query = `
            SELECT d.* 
            FROM designations d
            JOIN department_designations dd ON d.designation_id = dd.designation_id
            WHERE dd.department_id = $1
            ORDER BY d.designation_level`;
        const { rows } = await db.query(query, [departmentId]);
        return rows;
    }

    async addDesignationToDepartment(departmentId, designationId) {
        const query = `
            INSERT INTO department_designations (department_id, designation_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING *`;
        const { rows } = await db.query(query, [departmentId, designationId]);
        return rows[0];
    }

    async removeDesignationFromDepartment(departmentId, designationId) {
        const query = `
            DELETE FROM department_designations 
            WHERE department_id = $1 AND designation_id = $2
            RETURNING *`;
        const { rows } = await db.query(query, [departmentId, designationId]);
        return rows[0];
    }

    async checkMappingExists(departmentId, designationId) {
        const query = `
            SELECT 1 FROM department_designations 
            WHERE department_id = $1 AND designation_id = $2`;
        const { rowCount } = await db.query(query, [departmentId, designationId]);
        return rowCount > 0;
    }

    async getFullMapping() {
        const query = `
            SELECT d.department_id, d.department_name, 
                   json_agg(json_build_object('designation_id', deg.designation_id, 'designation_name', deg.designation_name)) as allowed_designations
            FROM departments d
            LEFT JOIN department_designations dd ON d.department_id = dd.department_id
            LEFT JOIN designations deg ON dd.designation_id = deg.designation_id
            GROUP BY d.department_id, d.department_name
            ORDER BY d.department_name`;
        const { rows } = await db.query(query);
        return rows;
    }
}

module.exports = new HRRepository();
