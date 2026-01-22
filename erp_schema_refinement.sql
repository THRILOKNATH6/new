-- ==================================================================================
-- GARMENTS ERP DATABASE SCHEMA - OPERATION WISE TRACKING
-- Database: GARMENTS
-- User: thrilok
-- ==================================================================================

-- ----------------------------------------------------------------------------------
-- 1. MASTER TABLES
-- ----------------------------------------------------------------------------------

DROP TABLE IF EXISTS bundle_tracking_op_wise;
DROP TABLE IF EXISTS bundling;
DROP TABLE IF EXISTS parts_book;
DROP TABLE IF EXISTS cutting;
DROP TABLE IF EXISTS operator_master;
DROP TABLE IF EXISTS operation_master;
DROP TABLE IF EXISTS style_master;

CREATE TABLE style_master (
    style_id VARCHAR(50) PRIMARY KEY,
    style_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operation_master (
    operation_id SERIAL PRIMARY KEY,
    operation_name VARCHAR(100) NOT NULL,
    sequence_no INTEGER NOT NULL, -- Defines the order of operations (1: Cut, 2: Sew Front, etc.)
    standard_allowed_minutes DECIMAL(5,2) DEFAULT 0.00 -- Essential for efficiency calc
);

CREATE TABLE operator_master (
    operator_id VARCHAR(20) PRIMARY KEY, -- Employee ID
    operator_name VARCHAR(100) NOT NULL,
    line_no INTEGER NOT NULL,
    skill_level VARCHAR(20) -- e.g., 'Grade A', 'Grade B'
);

-- ----------------------------------------------------------------------------------
-- 2. TRANSACTION TABLES
-- ----------------------------------------------------------------------------------

CREATE TABLE cutting (
    cutting_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL, -- Logical link to Order
    lay_no INTEGER NOT NULL,
    style_id VARCHAR(50) NOT NULL REFERENCES style_master(style_id),
    colour_code VARCHAR(20) NOT NULL,
    size VARCHAR(10) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    no_of_parts INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uniq_cutting_lay UNIQUE (style_id, lay_no, colour_code, size)
);

CREATE TABLE parts_book (
    part_id SERIAL PRIMARY KEY,
    style_id VARCHAR(50) NOT NULL REFERENCES style_master(style_id),
    cutting_part_no INTEGER NOT NULL, -- e.g., 1 for Front, 2 for Back
    part_name VARCHAR(50) NOT NULL,
    CONSTRAINT uniq_style_part UNIQUE (style_id, cutting_part_no)
);

CREATE TABLE bundling (
    bundle_id SERIAL PRIMARY KEY,
    cutting_id INTEGER NOT NULL REFERENCES cutting(cutting_id),
    style_id VARCHAR(50) NOT NULL REFERENCES style_master(style_id),
    colour_code VARCHAR(20) NOT NULL,
    size VARCHAR(10) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    starting_no INTEGER NOT NULL,
    ending_no INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure bundle quantities match range
    CONSTRAINT check_bundle_qty CHECK ((ending_no - starting_no) + 1 = qty)
);
-- Partial index to prevent overlapping ranges per style/color (Advanced constraint)
-- Note: Logic usually handled in app, but simplified uniqueness here:
CREATE UNIQUE INDEX idx_unique_bundle_start ON bundling (style_id, colour_code, starting_no);


-- ----------------------------------------------------------------------------------
-- 3. CORE TRACKING TABLE (Operation-Wise)
-- ----------------------------------------------------------------------------------

CREATE TABLE bundle_tracking_op_wise (
    tracking_op_id BIGSERIAL PRIMARY KEY,
    bundle_id INTEGER NOT NULL REFERENCES bundling(bundle_id),
    operation_id INTEGER NOT NULL REFERENCES operation_master(operation_id),
    operator_id VARCHAR(20) NOT NULL REFERENCES operator_master(operator_id),
    part_id INTEGER NOT NULL REFERENCES parts_book(part_id),
    
    starting_no INTEGER NOT NULL, -- Snapshot from bundle, in case of splits later
    ending_no INTEGER NOT NULL,
    
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'HOLD')),
    
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_time TIMESTAMP,
    
    -- Ensure completion time is after start time
    CONSTRAINT check_times CHECK (completed_time IS NULL OR completed_time >= start_time)
);

-- ----------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXING & EXPLANATION
-- ----------------------------------------------------------------------------------

-- A. Dashboard WIP Queries: Filter by Line (via Operator) and Status
-- Justification: Real-time dashboards filter heavily on status 'IN_PROGRESS' for specific lines.
CREATE INDEX idx_tracking_status_operator ON bundle_tracking_op_wise (status, operator_id);

-- B. Bundle History: Fast lookup for a specific bundle's journey
-- Justification: RFID scans need to quickly find the last status of a specific bundle.
CREATE INDEX idx_tracking_bundle_id ON bundle_tracking_op_wise (bundle_id);

-- C. Bottleneck Detection: Grouping by Operation and Status
-- Justification: Reporting queries need to count 'PENDING' or 'IN_PROGRESS' per operation_id.
CREATE INDEX idx_tracking_op_status ON bundle_tracking_op_wise (operation_id, status);

-- D. Date Range Reports: Filter by timestamps
-- Justification: End-of-day reports filter by start/completed times.
CREATE INDEX idx_tracking_dates ON bundle_tracking_op_wise (start_time, completed_time);


-- ----------------------------------------------------------------------------------
-- 5. ANALYTICAL QUERIES (BUSINESS LOGIC)
-- ----------------------------------------------------------------------------------

-- QUERY 1: Live WIP per Line
-- Logic: Find active operations (IN_PROGRESS) joined with Operator Master to get Line No.
-- Usage: Main TV Display on Floor
/*
SELECT 
    om.line_no, 
    COUNT(bt.bundle_id) as active_bundles,
    SUM(bt.ending_no - bt.starting_no + 1) as total_pieces_in_wip
FROM bundle_tracking_op_wise bt
JOIN operator_master om ON bt.operator_id = om.operator_id
WHERE bt.status = 'IN_PROGRESS'
GROUP BY om.line_no
ORDER BY om.line_no;
*/

-- QUERY 2: Operator Efficiency (Actual vs Standard)
-- Logic: Sum of (SAM * Qty) / (Actual Minutes Worked)
-- Note: Requires Completed operations only.
/*
SELECT 
    op.operator_name,
    COUNT(bt.bundle_id) as bundles_completed,
    SUM(b.qty) as total_pieces,
    SUM(opm.standard_allowed_minutes * b.qty) as earned_minutes,
    EXTRACT(EPOCH FROM SUM(bt.completed_time - bt.start_time))/60 as actual_minutes,
    -- Efficiency % calculation
    CASE WHEN EXTRACT(EPOCH FROM SUM(bt.completed_time - bt.start_time)) > 0 
         THEN (SUM(opm.standard_allowed_minutes * b.qty) / (EXTRACT(EPOCH FROM SUM(bt.completed_time - bt.start_time))/60)) * 100
         ELSE 0 
    END as efficiency_percentage
FROM bundle_tracking_op_wise bt
JOIN operator_master op ON bt.operator_id = op.operator_id
JOIN operation_master opm ON bt.operation_id = opm.operation_id
JOIN bundling b ON bt.bundle_id = b.bundle_id
WHERE bt.status = 'COMPLETED'
  AND bt.completed_time >= CURRENT_DATE -- Today only
GROUP BY op.operator_name;
*/

-- QUERY 3: Bundle Aging (Stuck Bundles)
-- Logic: Find bundles IN_PROGRESS for more than X defined minutes (e.g., 60 mins).
/*
SELECT 
    b.bundle_id,
    opm.operation_name,
    op.operator_name,
    bt.start_time,
    EXTRACT(EPOCH FROM (NOW() - bt.start_time))/3600 as hours_stuck
FROM bundle_tracking_op_wise bt
JOIN bundling b ON bt.bundle_id = b.bundle_id
JOIN operation_master opm ON bt.operation_id = opm.operation_id
JOIN operator_master op ON bt.operator_id = op.operator_id
WHERE bt.status = 'IN_PROGRESS'
AND bt.start_time < NOW() - INTERVAL '1 hour' -- Threshold
ORDER BY bt.start_time ASC;
*/

-- QUERY 4: Operation Bottleneck Detection
-- Logic: Operations with high PENDING counts (waiting to be processed) or high avg duration.
-- Note: 'PENDING' usually implies waiting in a queue before the operator takes it.
-- Assuming we track 'queue' as a status. If not, we count 'IN_PROGRESS' pile-up.
/*
SELECT 
    opm.operation_name,
    COUNT(*) as current_load_bundles,
    AVG(EXTRACT(EPOCH FROM (NOW() - bt.start_time))/60) as avg_minutes_running
FROM bundle_tracking_op_wise bt
JOIN operation_master opm ON bt.operation_id = opm.operation_id
WHERE bt.status = 'IN_PROGRESS'
GROUP BY opm.operation_name
HAVING COUNT(*) > 5 -- Threshold for alert
ORDER BY current_load_bundles DESC;
*/


-- ----------------------------------------------------------------------------------
-- 6. SAMPLE DATA
-- ----------------------------------------------------------------------------------

-- Master Data
INSERT INTO style_master (style_id, style_name) VALUES ('ST-2024-001', 'Classic Polo Shirt');
INSERT INTO operation_master (operation_name, sequence_no, standard_allowed_minutes) VALUES 
('Front Placket Sew', 10, 1.5),
('Sleeve Hem', 20, 0.8),
('Side Seam', 30, 2.0);
INSERT INTO operator_master (operator_id, operator_name, line_no, skill_level) VALUES 
('OP-101', 'Alice', 1, 'Grade A'),
('OP-102', 'Bob', 1, 'Grade B');

-- Transaction Data
INSERT INTO cutting (order_id, lay_no, style_id, colour_code, size, qty, no_of_parts) VALUES
('PO-9988', 1, 'ST-2024-001', 'NAVY', 'M', 100, 3);

-- Assuming Cutting ID 1 generated
INSERT INTO parts_book (style_id, cutting_part_no, part_name) VALUES 
('ST-2024-001', 1, 'Front Panel'),
('ST-2024-001', 2, 'Back Panel');

INSERT INTO bundling (cutting_id, style_id, colour_code, size, qty, starting_no, ending_no) VALUES
(1, 'ST-2024-001', 'NAVY', 'M', 20, 1, 20),
(1, 'ST-2024-001', 'NAVY', 'M', 20, 21, 40);

-- Tracking: Bundle 1 started operation 1 by Alice
INSERT INTO bundle_tracking_op_wise 
(bundle_id, operation_id, operator_id, part_id, starting_no, ending_no, status, start_time) 
VALUES
(1, 1, 'OP-101', 1, 1, 20, 'IN_PROGRESS', NOW() - INTERVAL '30 minutes');
