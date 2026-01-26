const db = require('../../config/db');

class LineRepository {

    /**
     * Fetch all lines with unified style and management data.
     * Includes: Basic info, Responsible Persons, and Running Style Metadata.
     */
    async getAllLines() {
        const query = `
            WITH LineStyle AS (
                -- Get the latest order for each running style to infer Color and Size Category
                SELECT DISTINCT ON (style_id) 
                    style_id, brand, colour_code, size_category
                FROM orders
                ORDER BY style_id, order_id DESC
            )
            SELECT 
                l.*,
                -- Responsible Persons
                sup.name as supervisor_name, sup_deg.designation_name as supervisor_designation,
                ie.name as ie_name, ie_deg.designation_name as ie_designation,
                qc.name as qc_name, qc_deg.designation_name as qc_designation,
                fh.name as feeding_helper_name, fh_deg.designation_name as feeding_helper_designation,
                mech.name as mechanic_name, mech_deg.designation_name as mechanic_designation,
                -- Style Info
                s.style_name,
                s.brand as style_brand,
                COALESCE(ls.brand, s.brand) as final_brand,
                c.color_name,
                sc.size_category_name
            FROM lines l
            LEFT JOIN employees sup ON l.line_supervisor_id = sup.emp_id
            LEFT JOIN designations sup_deg ON sup.designation_id = sup_deg.designation_id
            LEFT JOIN employees ie ON l.line_ie_id = ie.emp_id
            LEFT JOIN designations ie_deg ON ie.designation_id = ie_deg.designation_id
            LEFT JOIN employees qc ON l.line_qc_id = qc.emp_id
            LEFT JOIN designations qc_deg ON qc.designation_id = qc_deg.designation_id
            LEFT JOIN employees fh ON l.line_feeding_helper_id = fh.emp_id
            LEFT JOIN designations fh_deg ON fh.designation_id = fh_deg.designation_id
            LEFT JOIN employees mech ON l.line_mechanic_id = mech.emp_id
            LEFT JOIN designations mech_deg ON mech.designation_id = mech_deg.designation_id
            LEFT JOIN style_master s ON l.running_style_id = s.style_id
            LEFT JOIN LineStyle ls ON l.running_style_id = ls.style_id
            LEFT JOIN color_names c ON (l.running_style_id = c.style_id AND ls.colour_code::text = c.color_code::text)
            LEFT JOIN size_categorys sc ON ls.size_category = sc.size_category_id
            ORDER BY l.line_no ASC
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    async getLineManpowerSummary(lineNo) {
        const query = `
            SELECT d.department_name, d.department_id, COUNT(e.emp_id) as count
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            WHERE e.working_line_no = $1 
               OR (e.working_line_no = 0 AND EXISTS (SELECT 1 FROM multi_work mw WHERE mw.emp_id = e.emp_id AND $1 = ANY(mw.multi_lines)))
            GROUP BY d.department_name, d.department_id
            ORDER BY 
                (CASE 
                    WHEN d.department_id = 1 THEN 0 
                    WHEN d.department_id = 4 THEN 1 
                    ELSE 2 
                END), 
                d.department_name
        `;
        const { rows } = await db.query(query, [lineNo]);
        return rows;
    }

    async getLineEmployeesFull(lineNo, tableName = null, styleId = null) {
        const safeTable = (tableName && styleId) ? tableName.replace(/[^a-z0-9_]/g, '') : 'operation_master';
        const styleFilter = (tableName && styleId) ? `AND om_multi.style_id = '${styleId.replace(/'/g, "''")}'` : '';
        const mainStyleFilter = (tableName && styleId) ? `AND om.style_id = '${styleId.replace(/'/g, "''")}'` : '';

        const query = `
            SELECT 
                e.emp_id, e.name, d.department_id, d.department_name, deg.designation_name, 
                e.assigned_operation_id, e.work_stage, e.daily_target,
                CASE 
                    WHEN e.assigned_operation_id = 0 THEN (
                        SELECT string_agg(om_multi.operation_name, ', ') 
                        FROM ${safeTable} om_multi 
                        WHERE om_multi.operation_id = ANY(mw.multi_operations)
                        ${styleFilter}
                    )
                    ELSE om.operation_name
                END as operation_name
            FROM employees e
            JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations deg ON e.designation_id = deg.designation_id
            LEFT JOIN multi_work mw ON e.emp_id = mw.emp_id
            LEFT JOIN ${safeTable} om ON (e.assigned_operation_id = om.operation_id ${mainStyleFilter})
            WHERE e.working_line_no = $1
               OR (e.working_line_no = 0 AND EXISTS (SELECT 1 FROM multi_work mw2 WHERE mw2.emp_id = e.emp_id AND $1 = ANY(mw2.multi_lines)))
            ORDER BY d.department_id ASC, e.name ASC
        `;
        const { rows } = await db.query(query, [lineNo]);
        return rows;
    }

    async getOperationsByStyleTable(tableName, styleId) {
        const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
        const query = `
            SELECT operation_id, operation_name, sam, operation_sequence
            FROM ${safeTable}
            WHERE style_id = $1
            ORDER BY operation_sequence ASC
        `;
        const { rows } = await db.query(query, [styleId]);
        return rows;
    }

    async getLineByNo(lineNo) {
        const query = `SELECT * FROM lines WHERE line_no = $1`;
        const { rows } = await db.query(query, [lineNo]);
        return rows[0];
    }

    async createLine(data) {
        const query = `
            INSERT INTO lines (
                line_no, line_name, block_id, running_style_id, 
                no_of_manpower, no_of_machines, status,
                line_supervisor_id, line_ie_id, line_qc_id,
                line_feeding_helper_id, line_mechanic_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const values = [
            data.line_no,
            data.line_name,
            data.block_id || null,
            data.running_style_id || null,
            data.no_of_manpower || 0,
            data.no_of_machines || 0,
            data.status || 'ACTIVE',
            data.line_supervisor_id || null,
            data.line_ie_id || null,
            data.line_qc_id || null,
            data.line_feeding_helper_id || null,
            data.line_mechanic_id || null
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    async updateLine(lineNo, data) {
        const query = `
            UPDATE lines SET
                line_name = COALESCE($2, line_name), 
                block_id = COALESCE($3, block_id), 
                running_style_id = COALESCE($4, running_style_id),
                no_of_manpower = COALESCE($5, no_of_manpower),
                no_of_machines = COALESCE($6, no_of_machines),
                status = COALESCE($7, status),
                line_supervisor_id = COALESCE($8, line_supervisor_id),
                line_ie_id = COALESCE($9, line_ie_id),
                line_qc_id = COALESCE($10, line_qc_id),
                line_feeding_helper_id = COALESCE($11, line_feeding_helper_id),
                line_mechanic_id = COALESCE($12, line_mechanic_id)
            WHERE line_no = $1
            RETURNING *
        `;
        const values = [
            lineNo,
            data.line_name,
            data.block_id,
            data.running_style_id,
            data.no_of_manpower,
            data.no_of_machines,
            data.status,
            data.line_supervisor_id,
            data.line_ie_id,
            data.line_qc_id,
            data.line_feeding_helper_id,
            data.line_mechanic_id
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    async deleteLine(lineNo) {
        const query = `DELETE FROM lines WHERE line_no = $1 RETURNING *`;
        const { rows } = await db.query(query, [lineNo]);
        return rows[0];
    }
}

module.exports = new LineRepository();
