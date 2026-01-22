const db = require('../src/config/db');
const MasterRepo = require('../src/repositories/it/masterRepo');

async function migrate() {
    console.log('Starting Size Table Migration (BOOLEAN/DECIMAL -> INTEGER)...');

    try {
        // 1. Get all size categories
        const categories = await MasterRepo.getAllSizeCategories();
        console.log(`Found ${categories.length} size categories to process.`);

        const client = await db.pool.connect();
        try {
            for (const cat of categories) {
                const tableName = MasterRepo.getSamSeamTableName(cat.size_category_name);
                const sizes = cat.sizes.split(',').map(s => s.trim()).filter(s => s);

                console.log(`Processing table: ${tableName} for category: ${cat.size_category_name}`);
                await MasterRepo.ensureSamSeamTable(client, tableName, sizes);
                console.log(`Successfully migrated/synced ${tableName}`);
            }
        } finally {
            client.release();
        }

        console.log('Migration COMPLETED successfully.');
    } catch (err) {
        console.error('Migration FAILED:', err);
    } finally {
        process.exit();
    }
}

migrate();
