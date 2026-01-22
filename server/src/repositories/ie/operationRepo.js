const db = require('../../config/db');

class OperationRepository {
    async getOperations(tableName, styleId) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
        const query = `SELECT * FROM "${safeTable}" WHERE style_id = $1 ORDER BY operation_sequence ASC`;
        const { rows } = await db.query(query, [styleId]);
        return rows;
    }

    async getOperationById(client, tableName, opId) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
        const query = `SELECT * FROM "${safeTable}" WHERE operation_id = $1`;
        const { rows } = await (client || db).query(query, [opId]);
        return rows[0];
    }

    async createOperation(client, tableName, data) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');

        // Remove operation_id from data if it's there (let SERIAL handle it)
        const { operation_id, ...payload } = data;

        const keys = Object.keys(payload);
        const values = Object.values(payload);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
            INSERT INTO "${safeTable}" (${keys.map(k => `"${k}"`).join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;
        const { rows } = await client.query(query, values);
        return rows[0];
    }

    async updateOperation(client, tableName, opId, data) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');

        // created_by and operation_id should not be updated
        const { created_by, operation_id, ...payload } = data;

        const keys = Object.keys(payload);
        const values = Object.values(payload);
        const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');

        const query = `
            UPDATE "${safeTable}" 
            SET ${setClause}
            WHERE operation_id = $1
            RETURNING *
        `;
        const { rows } = await client.query(query, [opId, ...values]);
        return rows[0];
    }

    async deleteOperation(client, tableName, opId) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
        const query = `DELETE FROM "${safeTable}" WHERE operation_id = $1 RETURNING *`;
        const { rows } = await client.query(query, [opId]);
        return rows[0];
    }
}

module.exports = new OperationRepository();
