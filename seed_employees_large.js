const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const firstNames = [
    "Aarav", "Advait", "Akash", "Ananya", "Arjun", "Bhavya", "Chaitanya", "Deepak", "Divya", "Esha",
    "Ganesh", "Gayatri", "Hari", "Indu", "Ishaan", "Janhavi", "Karthik", "Kavya", "Lokesh", "Manju",
    "Nikhil", "Nisha", "Omkar", "Pallavi", "Pranav", "Priyanka", "Rahul", "Riya", "Sanjay", "Sravanthi",
    "Thrilok", "Uma", "Varun", "Veda", "Vivek", "Yamini", "Yash", "Zoya", "Amrita", "Bhaskar",
    "Chandini", "Dinesh", "Ekta", "Farhan", "Gita", "Hemant", "Ishani", "Jugal", "Kiran", "Lata",
    "Madhav", "Nandini", "Ojas", "Pooja", "Qasim", "Rashmi", "Suresh", "Tanvi", "Uday", "Vaishali"
];

const lastNames = [
    "Sharma", "Verma", "Iyer", "Nair", "Reddy", "Patel", "Singh", "Gupta", "Kumar", "Rao",
    "Deshmukh", "Choudhury", "Bose", "Das", "Joshi", "Kulkarni", "Menon", "Pillai", "Naidu", "Goud",
    "Yadav", "Mishra", "Trivedi", "Pathak", "Sinha", "Prasad", "Murthy", "Srinivasan", "Venkatesh", "Hebbar"
];

const departments = [
    { id: 1, name: 'Production', weight: 80 },
    { id: 4, name: 'IE', weight: 5 },
    { id: 2, name: 'Quality', weight: 5 },
    { id: 5, name: 'HR', weight: 2 },
    { id: 7, name: 'Cutting', weight: 5 },
    { id: 6, name: 'IT', weight: 1 },
    { id: 3, name: 'Maintenance', weight: 2 }
];

async function getAllowedDesignations() {
    const query = `
        SELECT dd.department_id, ds.designation_id, ds.designation_level 
        FROM department_designations dd 
        JOIN designations ds ON dd.designation_id = ds.designation_id`;
    const { rows } = await pool.query(query);
    const mapping = {};
    rows.forEach(r => {
        if (!mapping[r.department_id]) mapping[r.department_id] = [];
        mapping[r.department_id].push({ id: r.designation_id, level: r.designation_level });
    });
    return mapping;
}

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
    return `${getRandom(firstNames)} ${getRandom(lastNames)}`;
}

function generateEmpId(index) {
    const year = new Date().getFullYear();
    const padIndex = String(index).padStart(4, '0');
    return `EMP-${year}-${padIndex}`;
}

async function seed() {
    const allowedDesignations = await getAllowedDesignations();
    const totalCount = 600;
    const targets = [];

    // Define designation splits
    // Below 7 (Managers/Incharges): 10% = 60
    // 7 or above (Operators/Tailors/Helpers): 90% = 540

    let highLevelCount = 0;
    let lowLevelCount = 0;

    for (let i = 1; i <= totalCount; i++) {
        // Pick department based on weight
        const rand = Math.random() * 100;
        let cumulative = 0;
        let dept = departments[0];
        for (const d of departments) {
            cumulative += d.weight;
            if (rand <= cumulative) {
                dept = d;
                break;
            }
        }

        const options = allowedDesignations[dept.id] || [];
        if (options.length === 0) continue;

        // Try to balance levels
        let selectedDesig;
        const lowLevels = options.filter(o => o.level >= 7);
        const highLevels = options.filter(o => o.level < 7);

        // Logic to maintain 10/90 split
        if (highLevelCount < 60 && (lowLevelCount >= 540 || Math.random() < 0.1)) {
            if (highLevels.length > 0) {
                selectedDesig = getRandom(highLevels);
                highLevelCount++;
            } else {
                selectedDesig = getRandom(lowLevels);
                lowLevelCount++;
            }
        } else {
            if (lowLevels.length > 0) {
                selectedDesig = getRandom(lowLevels);
                lowLevelCount++;
            } else {
                selectedDesig = getRandom(highLevels);
                highLevelCount++;
            }
        }

        const name = generateName();
        const empId = generateEmpId(i);
        const joinDate = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365 * 3)); // 3 years spread

        targets.push([
            empId,
            `QR-${empId}`,
            `TK-${Math.floor(Math.random() * 10000)}`,
            name,
            dept.id,
            selectedDesig.id,
            1, // Block-1
            1, // Shift-1
            'ACTIVE',
            joinDate.toISOString().split('T')[0],
            Math.random() > 0.4 ? 'MALE' : 'FEMALE',
            selectedDesig.level < 7 ? 40000 + Math.random() * 20000 : 12000 + Math.random() * 8000
        ]);
    }

    console.log(`Prepared ${targets.length} records. High Level: ${highLevelCount}, Low Level: ${lowLevelCount}`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const t of targets) {
            await client.query(`
                INSERT INTO employees (
                    emp_id, qr_id, token_no, name, department_id, designation_id, 
                    block_id, shift_no, status, date_of_join, gender, salary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (emp_id) DO NOTHING`, t);
        }
        await client.query('COMMIT');
        console.log("Seeding complete.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Seeding failed:", e);
    } finally {
        client.release();
    }
}

seed().then(() => pool.end());
