const db = require('../../config/db');

class MultiWorkRepository {
    async getMultiWorkByEmpId(client, empId) {
        const dbClient = client || db;
        const query = 'SELECT * FROM multi_work WHERE emp_id = $1';
        const { rows } = await dbClient.query(query, [empId]);
        return rows[0];
    }

    async upsertMultiWork(client, { empId, multiLines, multiOperations }) {
        const dbClient = client || db;
        const query = `
            INSERT INTO multi_work (emp_id, multi_lines, multi_operations, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (emp_id) 
            DO UPDATE SET 
                multi_lines = EXCLUDED.multi_lines,
                multi_operations = EXCLUDED.multi_operations,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const { rows } = await dbClient.query(query, [empId, multiLines || [], multiOperations || []]);
        return rows[0];
    }

    async deleteMultiWork(client, empId) {
        const dbClient = client || db;
        await dbClient.query('DELETE FROM multi_work WHERE emp_id = $1', [empId]);
    }
}

module.exports = new MultiWorkRepository();
