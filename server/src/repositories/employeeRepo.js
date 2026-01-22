const db = require('../config/db');

class EmployeeRepository {
    async findById(empId) {
        const query = `
      SELECT e.*, d.department_name, deg.designation_name, b.block_name, s.shift_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations deg ON e.designation_id = deg.designation_id
      LEFT JOIN blocks b ON e.block_id = b.block_id
      LEFT JOIN shifts s ON e.shift_no = s.shift_no
      WHERE e.emp_id = $1`;
        const { rows } = await db.query(query, [empId]);
        return rows[0];
    }

    async updateProfile(empId, { name, address }) {
        // Only updates allowed fields
        const query = `
        UPDATE employees 
        SET name = COALESCE($1, name), 
            address = COALESCE($2, address)
        WHERE emp_id = $3
        RETURNING emp_id, name, address`;

        const { rows } = await db.query(query, [name, address, empId]);
        return rows[0];
    }

    async updateAvatar(empId, photoUrl) {
        const query = `
        UPDATE employees 
        SET photo_url = $1
        WHERE emp_id = $2
        RETURNING photo_url`;

        const { rows } = await db.query(query, [photoUrl, empId]);
        return rows[0];
    }
}

module.exports = new EmployeeRepository();
