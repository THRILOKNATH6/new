const db = require('./src/config/db');
const MasterRepo = require('./src/repositories/it/masterRepo');

async function syncLoadingTables() {
    console.log("Starting Loading Table Sync...");
    try {
        const categories = await MasterRepo.getAllSizeCategories();
        console.log(`Found ${categories.length} size categories.`);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const cat of categories) {
                console.log(`Checking loading table for: ${cat.size_category_name}`);
                const loadingTable = MasterRepo.getLoadingTableName(cat.size_category_name);
                const sizes = cat.sizes.split(',').map(s => s.trim()).filter(s => s);
                await MasterRepo.ensureLoadingTable(client, loadingTable, sizes);
                console.log(`Verified/Created table: ${loadingTable}`);
            }
            await client.query('COMMIT');
            console.log("Sync Complete.");
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Sync Failed:", e);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error fetching categories:", err);
    } finally {
        process.exit();
    }
}

syncLoadingTables();
