const HRRepo = require('./server/src/repositories/hr/hrRepo');
const db = require('./server/src/config/db');

async function test() {
    try {
        const mappings = await HRRepo.getFullMapping();
        console.log('Mappings:', JSON.stringify(mappings, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
