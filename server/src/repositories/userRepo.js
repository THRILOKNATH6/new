const db = require('../config/db');

class UserRepository {
  async findByUsername(username) {
    const query = `
        SELECT u.user_id, u.username, u.password_hash, u.employee_id, u.is_active,
               e.designation_id, d.designation_name,
               COALESCE(
                   array_agg(rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), 
                   '{}'
               ) as permissions
        FROM app_users u
        LEFT JOIN employees e ON u.employee_id = e.emp_id
        LEFT JOIN designations d ON e.designation_id = d.designation_id
        LEFT JOIN role_permissions rp ON d.designation_id = rp.designation_id
        WHERE u.username = $1
        GROUP BY u.user_id, e.designation_id, d.designation_name`;
    const { rows } = await db.query(query, [username]);
    return rows[0];
  }

  async findById(userId) {
    const query = `
      SELECT u.user_id, u.username, u.employee_id, u.is_active, 
             e.designation_id, d.designation_name
      FROM app_users u
      LEFT JOIN employees e ON u.employee_id = e.emp_id
      LEFT JOIN designations d ON e.designation_id = d.designation_id
      WHERE u.user_id = $1`;
    const { rows } = await db.query(query, [userId]);
    return rows[0];
  }

  async create({ username, passwordHash, employeeId }) {
    const query = `
      INSERT INTO app_users (username, password_hash, employee_id)
      VALUES ($1, $2, $3)
      RETURNING user_id, username, employee_id, created_at`;
    const { rows } = await db.query(query, [username, passwordHash, employeeId || null]);
    return rows[0];
  }
}

module.exports = new UserRepository();
