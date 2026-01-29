const LoadingRepo = require('../../repositories/production/loadingRepo');
const HRRepo = require('../../repositories/hr/hrRepo');
const MasterRepo = require('../../repositories/it/masterRepo');
const CuttingRepo = require('../../repositories/cuttingRepo');
const LineRepo = require('../../repositories/ie/lineRepo');
const BundleRepo = require('../../repositories/bundleRepo');
const db = require('../../config/db');

class LoadingService {
    async getActiveLines(user) {
        // Public endpoint for Production staff to select lines
        const lines = await LineRepo.getAllLines();
        return lines
            .filter(l => l.status === 'ACTIVE')
            .map(l => ({
                line_no: l.line_no,
                line_name: l.line_name,
                status: l.status
            }));
    }

    async getBundlesForOrder(orderId) {
        // Public endpoint for Loading workflow to fetch bundles
        return await BundleRepo.getByOrder(orderId);
    }

    async searchOrders(searchParams) {
        // Public endpoint for Loading workflow to search orders
        // No strict RBAC - accessible to Production and Supermarket staff
        // IMPORTANT: Does NOT filter by bundling completion (unlike Cutting view)

        const { order_id, q, limit = 50, offset = 0 } = searchParams;

        let query = `
            SELECT o.*, sc.sizes, sc.size_category_name
            FROM orders o
            LEFT JOIN size_categorys sc ON o.size_category = sc.size_category_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Generic search (style, PO, buyer, order_id)
        if (q) {
            query += ` AND (
                o.style_id ILIKE $${paramIndex} OR 
                o.po ILIKE $${paramIndex} OR 
                o.buyer ILIKE $${paramIndex} OR 
                o.order_id::text ILIKE $${paramIndex}
            )`;
            params.push(`%${q}%`);
            paramIndex++;
        } else if (order_id) {
            // Specific order_id search
            if (isNaN(parseInt(order_id))) {
                // If not a number, treat as generic search
                query += ` AND (
                    o.style_id ILIKE $${paramIndex} OR 
                    o.po ILIKE $${paramIndex} OR 
                    o.buyer ILIKE $${paramIndex}
                )`;
                params.push(`%${order_id}%`);
            } else {
                query += ` AND o.order_id = $${paramIndex}`;
                params.push(parseInt(order_id));
            }
            paramIndex++;
        }

        query += ` ORDER BY o.order_id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(parseInt(limit), 200), Math.max(parseInt(offset), 0));

        const { rows } = await db.query(query, params);

        return {
            orders: rows,
            pagination: {
                page: Math.floor(offset / limit) + 1,
                limit: parseInt(limit),
                total: rows.length,
                pages: Math.ceil(rows.length / limit)
            }
        };
    }
    async getDashboardData(user) {
        // Enforce access rule: ONLY employees with Department = Supermarket (10) and Level 1-7
        const employee = await this.getEmployeeDetails(user.employeeId);
        if (employee.department_id !== 10) throw new Error('Access Denied: Supermarket department only');
        if (employee.designation_level > 7) throw new Error('Access Denied: Management level authorization required');

        const transactions = await LoadingRepo.getAllTransactions(); // Now only returns COMPLETED transactions
        const pending = await LoadingRepo.getPendingTransactions(); // PENDING APPROVAL
        const pendingHandover = await LoadingRepo.getPendingHandoverTransactions(); // PENDING HANDOVER
        return { transactions, pending, pendingHandover };
    }

    async getEmployeeDetails(empId) {
        const employee = await HRRepo.getEmployeeById(empId);
        if (!employee) throw new Error('Employee not found');
        if (employee.status !== 'ACTIVE') throw new Error('Employee is inactive');

        // Get designation and department names
        const dept = await db.query('SELECT department_name FROM departments WHERE department_id = $1', [employee.department_id]);
        const deg = await db.query('SELECT designation_name, designation_level FROM designations WHERE designation_id = $1', [employee.designation_id]);

        return {
            ...employee,
            department_id: parseInt(employee.department_id),
            department_name: dept.rows[0]?.department_name,
            designation_name: deg.rows[0]?.designation_name,
            designation_level: parseInt(deg.rows[0]?.designation_level)
        };
    }

    async getRecommendation(lineNo) {
        const lastLoading = await LoadingRepo.getLastLoadingByLine(lineNo);
        if (!lastLoading) return { message: 'No prior loading found for this line. Manual selection required.' };

        const recommendation = await LoadingRepo.getCuttingRecommendations(
            lastLoading.order_id,
            lastLoading.style_id,
            lastLoading.colour_code
        );

        return {
            lastLoading,
            recommendation
        };
    }

    async createTransaction(data, user) {
        const { employeeId, lineNo, orderId, quantities } = data;

        // 1. Verify creator employee
        // RULE: ANY employee from the Production Department (ID 1) can initiate.
        const employee = await this.getEmployeeDetails(employeeId);
        if (employee.department_id !== 1) throw new Error('Only Production department employees can initiate loading transactions');
        if (employee.designation_level > 7) throw new Error('Level 1-7 production staff required for initiation');

        // 2. Get order details to find correct loading table
        const order = await CuttingRepo.getOrderWithSizes(orderId);
        if (!order) throw new Error('Order not found');

        const tableName = MasterRepo.getLoadingTableName(order.size_category_name);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await LoadingRepo.createTransaction(client, tableName, {
                order_id: orderId,
                line_no: lineNo,
                created_by: employeeId,
                quantities
            });
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async approveTransaction(loadingId, categoryName, approverId, user) {
        // 1. Verify approver
        // RULE: Any employee with designation level 1–7 (Any department) 
        const employee = await this.getEmployeeDetails(approverId);
        if (employee.designation_level > 7) throw new Error('Approver designation level must be 1-7');

        const tableName = MasterRepo.getLoadingTableName(categoryName);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await LoadingRepo.approveTransaction(client, tableName, loadingId, approverId);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async rejectTransaction(loadingId, categoryName, user) {
        const tableName = MasterRepo.getLoadingTableName(categoryName);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await LoadingRepo.deleteTransaction(client, tableName, loadingId);
            await client.query('COMMIT');
            return { message: 'Transaction rejected and deleted successfully' };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async handoverTransaction(loadingId, categoryName, handoverId, variantStyleId, user) {
        // 1. Verify handover employee
        // RULE: ONLY Production Department (ID 1), Level 1-7
        const employee = await this.getEmployeeDetails(handoverId);
        if (employee.department_id !== 1) throw new Error('Handover recipient must belong to Production department');
        if (employee.designation_level > 7) throw new Error('Handover recipient must be level 1-7');

        // 2. Style Change Logic
        const loading = await LoadingRepo.findLoadingById(loadingId, categoryName);
        if (variantStyleId && variantStyleId !== loading.style_id) {
            // RULE: style changes at this step -> ONLY allow Production employees with designation level ≤ 5.
            if (employee.designation_level > 5) {
                throw new Error('Style change at handover requires designation level 5 or below');
            }
        }

        const tableName = MasterRepo.getLoadingTableName(categoryName);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await LoadingRepo.handoverTransaction(client, tableName, loadingId, handoverId);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new LoadingService();
