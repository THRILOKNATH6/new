const db = require('./server/src/config/db');

async function testTransactionClassification() {
    try {
        console.log('Testing transaction classification logic...\n');

        // Test: Get all size categories
        const catQuery = `SELECT size_category_name FROM size_categorys`;
        const { rows: categories } = await db.query(catQuery);
        console.log(`Found ${categories.length} size categories`);

        let totalTransactions = 0;
        let approvedOnlyCount = 0;
        let completedCount = 0;
        let pendingApprovalCount = 0;
        let pendingHandoverCount = 0;

        // Test each category
        for (const cat of categories) {
            const tableName = `loading_${cat.size_category_name.toLowerCase().replace(/\s+/g, '_')}`;

            // Check if table exists
            const tableCheck = await db.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [tableName]);

            if (tableCheck.rowCount > 0) {
                console.log(`\n=== Testing table: ${tableName} ===`);

                // Test all transactions query
                const allQuery = `
                    SELECT loading_id, approved_status, handover_by, created_by, approved_by
                    FROM "${tableName}"
                `;
                const { rows: allRows } = await db.query(allQuery);
                totalTransactions += allRows.length;

                // Test COMPLETED transactions query
                const completedQuery = `
                    SELECT loading_id, approved_status, handover_by
                    FROM "${tableName}"
                    WHERE approved_status = 'APPROVED' AND handover_by IS NOT NULL
                `;
                const { rows: completedRows } = await db.query(completedQuery);
                completedCount += completedRows.length;

                // Test PENDING APPROVAL transactions query
                const pendingApprovalQuery = `
                    SELECT loading_id, approved_status, handover_by
                    FROM "${tableName}"
                    WHERE approved_status IS NULL OR approved_status = 'PENDING_APPROVAL'
                `;
                const { rows: pendingApprovalRows } = await db.query(pendingApprovalQuery);
                pendingApprovalCount += pendingApprovalRows.length;

                // Test PENDING HANDOVER transactions query
                const pendingHandoverQuery = `
                    SELECT loading_id, approved_status, handover_by
                    FROM "${tableName}"
                    WHERE approved_status = 'APPROVED' AND handover_by IS NULL
                `;
                const { rows: pendingHandoverRows } = await db.query(pendingHandoverQuery);
                pendingHandoverCount += pendingHandoverRows.length;

                // Count APPROVED only (without handover)
                const approvedOnlyQuery = `
                    SELECT loading_id, approved_status, handover_by
                    FROM "${tableName}"
                    WHERE approved_status = 'APPROVED'
                `;
                const { rows: approvedOnlyRows } = await db.query(approvedOnlyQuery);
                approvedOnlyCount += approvedOnlyRows.length;

                console.log(`Total records: ${allRows.length}`);
                console.log(`COMPLETED (approved + handover): ${completedRows.length}`);
                console.log(`PENDING APPROVAL: ${pendingApprovalRows.length}`);
                console.log(`PENDING HANDOVER: ${pendingHandoverRows.length}`);
                console.log(`APPROVED only (includes pending handover): ${approvedOnlyRows.length}`);

                // Show sample records
                if (allRows.length > 0) {
                    console.log('\nSample transactions:');
                    allRows.slice(0, 3).forEach(row => {
                        console.log(`  ID: ${row.loading_id}, Status: ${row.approved_status}, Handover: ${row.handover_by || 'NULL'}`);
                    });
                }
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Total transactions across all categories: ${totalTransactions}`);
        console.log(`COMPLETED (should be in "Successful Transactions"): ${completedCount}`);
        console.log(`PENDING APPROVAL: ${pendingApprovalCount}`);
        console.log(`PENDING HANDOVER (Step 3 only): ${pendingHandoverCount}`);
        console.log(`Total check: ${completedCount + pendingApprovalCount + pendingHandoverCount} = ${completedCount + pendingApprovalCount + pendingHandoverCount === totalTransactions ? '✅ MATCHES' : '❌ MISMATCH'}`);

        console.log('\n=== BUG FIX VALIDATION ===');
        console.log(`Before fix: All ${totalTransactions} would appear in "Successful Transactions"`);
        console.log(`After fix: Only ${completedCount} should appear in "Successful Transactions"`);
        console.log(`Step-3-only transactions (${pendingHandoverCount}) should appear in "Pending Handover" section`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await db.pool.end();
    }
}

testTransactionClassification();