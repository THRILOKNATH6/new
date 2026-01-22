-- ==================================================================================
-- GARMENTS ERP - HR, MACHINES, & LINE MANAGEMENT MODULE
-- Real-world Factory Schema (PostgreSQL)
-- ==================================================================================

-- ----------------------------------------------------------------------------------
-- 1. CONFIGURATION & CLEANUP
-- ----------------------------------------------------------------------------------

-- Drop tables in reverse dependency order to ensure clean reset
DROP TABLE IF EXISTS machine_services CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS size_cat1_op_sam_seam CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS designations CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
-- Note: STYLE_MASTER is assumed to exist from previous module or created here if missing
CREATE TABLE IF NOT EXISTS style_master (
    style_id VARCHAR(50) PRIMARY KEY,
    style_name VARCHAR(100)
);

-- ----------------------------------------------------------------------------------
-- 2. CORE MASTER TABLES (HR & INFRA)
-- ----------------------------------------------------------------------------------

CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE designations (
    designation_id SERIAL PRIMARY KEY,
    designation_name VARCHAR(100) NOT NULL UNIQUE,
    designation_level INTEGER NOT NULL -- 1: Top Mgmt, ... 10: Worker
);

CREATE TABLE blocks (
    block_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(100) NOT NULL,
    phase_no VARCHAR(20),
    block_name VARCHAR(100) NOT NULL
);

CREATE TABLE shifts (
    shift_no SERIAL PRIMARY KEY,
    shift_name VARCHAR(50) DEFAULT 'General',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

-- ----------------------------------------------------------------------------------
-- 3. EMPLOYEES & LINES (CIRCULAR REFERENCE HANDLING)
-- ----------------------------------------------------------------------------------

-- Step A: Create Employees table (FK to Lines added later)
CREATE TABLE employees (
    emp_id VARCHAR(20) PRIMARY KEY, -- e.g., EMP-2024-001
    qr_id VARCHAR(50) UNIQUE NOT NULL,
    token_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_join DATE NOT NULL,
    photo_url VARCHAR(255),
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    
    -- Foreign Keys
    department_id INTEGER REFERENCES departments(department_id),
    designation_id INTEGER REFERENCES designations(designation_id),
    block_id INTEGER REFERENCES blocks(block_id),
    shift_no INTEGER REFERENCES shifts(shift_no),
    
    -- Placeholder for Operation Assignment (Logic usually implies link to OP Master)
    assigned_operation_id INTEGER, 
    
    working_line_no INTEGER -- Constraint added after LINES table creation
);

-- Step B: Create Lines table
CREATE TABLE lines (
    line_no SERIAL PRIMARY KEY,
    line_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "Line 05"
    block_id INTEGER REFERENCES blocks(block_id),
    running_style_id VARCHAR(50) REFERENCES style_master(style_id),
    
    no_of_manpower INTEGER DEFAULT 0,
    no_of_machines INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')),
    
    -- Key Roles (Mapped to Employees)
    -- specific checks can be enforced via triggers strictly, here logic via App
    line_supervisor_id VARCHAR(20) REFERENCES employees(emp_id),
    line_ie_id VARCHAR(20) REFERENCES employees(emp_id),
    line_feeding_helper_id VARCHAR(20) REFERENCES employees(emp_id),
    line_qc_id VARCHAR(20) REFERENCES employees(emp_id),
    line_mechanic_id VARCHAR(20) REFERENCES employees(emp_id),
    line_pm_id VARCHAR(20) REFERENCES employees(emp_id)
);

-- Step C: Close Circular Reference
ALTER TABLE employees
ADD CONSTRAINT fk_emp_line
FOREIGN KEY (working_line_no) REFERENCES lines(line_no);

-- ----------------------------------------------------------------------------------
-- 4. OPERATIONS & SAM (IE DATA)
-- ----------------------------------------------------------------------------------

CREATE TABLE size_cat1_op_sam_seam (
    operation_id SERIAL PRIMARY KEY,
    style_id VARCHAR(50) NOT NULL REFERENCES style_master(style_id),
    operation_name VARCHAR(150) NOT NULL,
    operation_sequence INTEGER NOT NULL, -- Critical for Line Balancing
    machine_type VARCHAR(50), -- e.g., 'SNLS', 'OL', 'KANSAI'
    
    sam DECIMAL(5,3) NOT NULL DEFAULT 0.000,
    cutting_part_no INTEGER, -- Link to part mapping if needed
    
    -- Size Validity Flags (True usually, False if OP skipped for size)
    xxs BOOLEAN DEFAULT TRUE,
    xs BOOLEAN DEFAULT TRUE,
    s BOOLEAN DEFAULT TRUE,
    m BOOLEAN DEFAULT TRUE,
    l BOOLEAN DEFAULT TRUE,
    xl BOOLEAN DEFAULT TRUE,
    xxl BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT uniq_style_op_seq UNIQUE (style_id, operation_sequence)
);

-- ----------------------------------------------------------------------------------
-- 5. MACHINE MANAGEMENT
-- ----------------------------------------------------------------------------------

CREATE TABLE machines (
    machine_id SERIAL PRIMARY KEY,
    qr_id VARCHAR(50) UNIQUE NOT NULL, -- Asset Tag
    name VARCHAR(100), -- Internal Name/Code
    brand VARCHAR(50) NOT NULL, -- JUKI, BROTHER, PEGASUS
    model VARCHAR(50),
    machine_type VARCHAR(50) NOT NULL,
    
    join_date DATE DEFAULT CURRENT_DATE,
    
    -- Location & Ownership
    block_id INTEGER REFERENCES blocks(block_id),
    line_no INTEGER REFERENCES lines(line_no),
    
    status VARCHAR(20) DEFAULT 'WORKING' CHECK (status IN ('WORKING', 'BREAKDOWN', 'IDLE', 'SCRAPPED')),
    condition VARCHAR(50), -- 'GOOD', 'NEEDS_SERVICE'
    
    no_of_services INTEGER DEFAULT 0,
    last_service_date DATE,
    
    guardian_id VARCHAR(20) REFERENCES employees(emp_id) -- Mechanic responsible
);

CREATE TABLE machine_services (
    service_id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
    service_date DATE DEFAULT CURRENT_DATE,
    mechanic_id VARCHAR(20) REFERENCES employees(emp_id),
    remarks TEXT,
    is_changed_parts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------------
-- 6. INDEXING FOR PERFORMANCE (10L+ Records)
-- ----------------------------------------------------------------------------------

-- Employees: Frequent filtering by Line (Attendance), Dept (Payroll), Status (Active count)
CREATE INDEX idx_emp_line ON employees (working_line_no);
CREATE INDEX idx_emp_dept ON employees (department_id);
CREATE INDEX idx_emp_status ON employees (status);
CREATE INDEX idx_emp_qr ON employees (qr_id); -- Fast Scan Lookup

-- Lines: Block-wise reporting
CREATE INDEX idx_lines_block ON lines (block_id);

-- Machines: Line inventory, Breakdown alerts
CREATE INDEX idx_machines_line ON machines (line_no);
CREATE INDEX idx_machines_status ON machines (status);
CREATE INDEX idx_machines_qr ON machines (qr_id);

-- Operations: Style calculation, Line loading sequence
CREATE INDEX idx_ops_style ON size_cat1_op_sam_seam (style_id);
CREATE INDEX idx_ops_seq ON size_cat1_op_sam_seam (style_id, operation_sequence);

-- ----------------------------------------------------------------------------------
-- 7. SAMPLE DATA
-- ----------------------------------------------------------------------------------

-- Core IDs
INSERT INTO departments (department_name) VALUES ('Production'), ('Quality'), ('Maintenance'), ('IE');
INSERT INTO designations (designation_name, designation_level) VALUES ('PM', 1), ('Supervisor', 3), ('Operator', 10), ('Mechanic', 5);
INSERT INTO blocks (unit_name, block_name) VALUES ('Unit-A', 'Block-1');
INSERT INTO shifts (start_time, end_time) VALUES ('08:00:00', '17:00:00');
INSERT INTO style_master (style_id, style_name) VALUES ('ST-2025-X', 'Winter Jacket') ON CONFLICT DO NOTHING;

-- Employees (Supervisors First)
INSERT INTO employees (emp_id, qr_id, token_no, name, department_id, designation_id, block_id, shift_no, status, date_of_join, gender) VALUES
('EMP-001', 'QR-EMP-001', 'T-001', 'John Supervisor', 1, 2, 1, 1, 'ACTIVE', '2023-01-01', 'MALE'),
('EMP-002', 'QR-EMP-002', 'T-002', 'Mike Mechanic', 3, 4, 1, 1, 'ACTIVE', '2023-01-05', 'MALE'),
('EMP-003', 'QR-EMP-003', 'T-003', 'Sarah IE', 4, 1, 1, 1, 'ACTIVE', '2023-02-01', 'FEMALE');

-- Lines
INSERT INTO lines (line_name, block_id, running_style_id, line_supervisor_id, line_mechanic_id, line_ie_id, status) VALUES
('Line-01', 1, 'ST-2025-X', 'EMP-001', 'EMP-002', 'EMP-003', 'ACTIVE');

-- Update Supervisor's Working Line
UPDATE employees SET working_line_no = 1 WHERE emp_id IN ('EMP-001', 'EMP-002', 'EMP-003');

-- Operations
INSERT INTO size_cat1_op_sam_seam (style_id, operation_name, operation_sequence, machine_type, sam) VALUES
('ST-2025-X', 'Shoulder Join', 10, 'SNLS', 0.450),
('ST-2025-X', 'Neck Pipe', 20, 'DNLS', 0.650);

-- Machines
INSERT INTO machines (qr_id, name, brand, machine_type, block_id, line_no, guardian_id) VALUES
('QR-MAC-1001', 'M-001', 'JUKI', 'SNLS', 1, 1, 'EMP-002'),
('QR-MAC-1002', 'M-002', 'BROTHER', 'DNLS', 1, 1, 'EMP-002');

