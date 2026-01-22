-- ==================================================================================
-- GARMENTS ERP - ROBUST SEED DATA
-- Cleans and Repopulates Database with Realistic Data
-- ==================================================================================

-- 1. CLEANUP
-- Truncate all tables and restart sequences to ensure clean state
TRUNCATE TABLE 
    departments, designations, blocks, shifts, style_master, 
    employees, lines, machines, machine_services, 
    operation_master, operator_master, size_cat1_op_sam_seam, parts_book, 
    orders, order_qty_cat1, cutting, bundling, bundle_tracking_op_wise,
    bundle_tracking, garment_production_raw
RESTART IDENTITY CASCADE;

-- 2. INFRASTRUCTURE & MASTERS

-- Departments (Explicit IDs)
INSERT INTO departments (department_id, department_name) VALUES 
(1, 'Production'), 
(2, 'Quality Assurance'), 
(3, 'Maintenance'), 
(4, 'Industrial Engineering'), 
(5, 'Human Resources'),
(6, 'Store & Fabrics'),
(7, 'Cutting Department');

-- Designations
INSERT INTO designations (designation_id, designation_name, designation_level) VALUES 
(1, 'Factory Manager', 1),
(2, 'Production Manager', 2),
(3, 'Floor Incharge', 3),
(4, 'Line Supervisor', 4),
(5, 'Quality Supervisor', 5),
(6, 'Line QC', 6),
(7, 'Mechanic', 5),
(8, 'Senior Machine Operator', 10),
(9, 'Machine Operator', 10),
(10, 'Helper', 11),
(11, 'Cutting Manager', 2);

-- Blocks
INSERT INTO blocks (block_id, unit_name, phase_no, block_name) VALUES 
(1, 'Factory-Alpha', 'Phase-1', 'Sewing Floor'),
(2, 'Factory-Alpha', 'Phase-1', 'Cutting Floor');

-- Shifts
INSERT INTO shifts (shift_no, shift_name, start_time, end_time) VALUES 
(1, 'General Shift', '09:00:00', '18:00:00');

-- Style Master
INSERT INTO style_master (style_id, style_name) VALUES 
('ST-POLO-2025', 'Classic Polo Shirt'),
('ST-DENIM-Basic', 'Basic 5-Pocket Jeans');

-- 3. EMPLOYEES (Phase 1: No Line Assignment)

-- Managers
INSERT INTO employees (emp_id, qr_id, token_no, name, department_id, designation_id, block_id, shift_no, status, date_of_join, gender, salary) VALUES
('EMP-MGR-01', 'QR-001', 'TK-001', 'Alice Manager', 1, 2, 1, 1, 'ACTIVE', '2023-01-01', 'FEMALE', 60000),
('EMP-SUP-01', 'QR-002', 'TK-002', 'Bob Supervisor', 1, 4, 1, 1, 'ACTIVE', '2023-01-01', 'MALE', 30000),
('EMP-MEC-01', 'QR-003', 'TK-003', 'Charlie Mechanic', 3, 7, 1, 1, 'ACTIVE', '2023-01-01', 'MALE', 28000),
('EMP-QC-01',  'QR-004', 'TK-004', 'Diana QC', 2, 6, 1, 1, 'ACTIVE', '2023-02-01', 'FEMALE', 25000),
('EMP-CUT-01', 'QR-301', 'TK-301', 'Frank Cutting', 7, 11, 2, 1, 'ACTIVE', '2023-05-01', 'MALE', 45000);

-- Operators (Will be assigned to Lines)
INSERT INTO employees (emp_id, qr_id, token_no, name, department_id, designation_id, block_id, shift_no, status, date_of_join, gender, salary) VALUES
('EMP-OP-01', 'QR-101', 'TK-101', 'Evan Operator', 1, 9, 1, 1, 'ACTIVE', '2023-03-01', 'MALE', 15000),
('EMP-OP-02', 'QR-102', 'TK-102', 'Fiona Operator', 1, 9, 1, 1, 'ACTIVE', '2023-03-01', 'FEMALE', 15000),
('EMP-OP-03', 'QR-103', 'TK-103', 'George Operator', 1, 9, 1, 1, 'ACTIVE', '2023-03-01', 'MALE', 15000),
('EMP-OP-04', 'QR-104', 'TK-104', 'Helen Helper', 1, 10, 1, 1, 'ACTIVE', '2023-04-01', 'FEMALE', 10000);

-- 4. LINES & MACHINES

-- Lines
INSERT INTO lines (line_no, line_name, block_id, running_style_id, line_supervisor_id, line_mechanic_id, line_qc_id, status) VALUES
(1, 'Line-01', 1, 'ST-POLO-2025', 'EMP-SUP-01', 'EMP-MEC-01', 'EMP-QC-01', 'ACTIVE');

-- Update Employees with Line
UPDATE employees SET working_line_no = 1 WHERE emp_id IN ('EMP-SUP-01', 'EMP-MEC-01', 'EMP-QC-01', 'EMP-OP-01', 'EMP-OP-02', 'EMP-OP-03', 'EMP-OP-04');

-- Machines
INSERT INTO machines (machine_id, qr_id, name, brand, machine_type, block_id, line_no, status, guardian_id) VALUES
(1, 'MAC-001', 'SNLS-01', 'JUKI', 'SNLS', 1, 1, 'WORKING', 'EMP-MEC-01'),
(2, 'MAC-002', 'SNLS-02', 'JUKI', 'SNLS', 1, 1, 'WORKING', 'EMP-MEC-01'),
(3, 'MAC-003', 'OL-01', 'PEGASUS', 'OVERLOCK', 1, 1, 'WORKING', 'EMP-MEC-01'),
(4, 'MAC-004', 'OL-02', 'PEGASUS', 'OVERLOCK', 1, 1, 'WORKING', 'EMP-MEC-01');

-- Machine Services
INSERT INTO machine_services (machine_id, mechanic_id, remarks, service_date) VALUES
(1, 'EMP-MEC-01', 'Routine Oil Check', CURRENT_DATE - 10);

-- 5. PRODUCTION MASTERS (IE)

-- Operation Master
INSERT INTO operation_master (operation_id, operation_name, sequence_no, standard_allowed_minutes) VALUES
(1, 'Shoulder Join', 10, 0.50),
(2, 'Neck Join', 20, 0.80),
(3, 'Sleeve Attach', 30, 1.20),
(4, 'Side Seam', 40, 1.50),
(5, 'Hemming', 50, 1.00);

-- Operator Master (Linked to Emp IDs)
INSERT INTO operator_master (operator_id, operator_name, line_no, skill_level) VALUES
('EMP-OP-01', 'Evan Operator', 1, 'Grade A'),
('EMP-OP-02', 'Fiona Operator', 1, 'Grade A'),
('EMP-OP-03', 'George Operator', 1, 'Grade B'),
('EMP-OP-04', 'Helen Helper', 1, 'Grade C');

-- Parts Book
INSERT INTO parts_book (part_id, style_id, cutting_part_no, part_name) VALUES
(1, 'ST-POLO-2025', 1, 'Front'),
(2, 'ST-POLO-2025', 2, 'Back'),
(3, 'ST-POLO-2025', 3, 'Sleeve');

-- Style Operations (Bulletin)
INSERT INTO size_cat1_op_sam_seam (style_id, operation_name, operation_sequence, machine_type, sam) VALUES
('ST-POLO-2025', 'Shoulder Join', 10, 'SNLS', 0.50),
('ST-POLO-2025', 'Sleeve Attach', 30, 'OVERLOCK', 1.20);

-- 6. ORDERS & CUTTING

-- Orders
INSERT INTO orders (order_id, buyer, brand, po, style_id, country, colour_code, order_quantity) VALUES
(1001, 'H&M', 'Basics', 'PO-HM-99', 'ST-POLO-2025', 'USA', 101, 1000);

-- Order Qty
INSERT INTO order_qty_cat1 (order_id, s, m, l) VALUES
(1001, 200, 500, 300);

-- Cutting (Lay 1: 50 layers)
-- S: 200 -> 4 bundles of 50? No, standard 20.
INSERT INTO cutting (cutting_id, order_id, lay_no, style_id, colour_code, size, qty, no_of_parts) VALUES
(1, '1001', 1, 'ST-POLO-2025', '101', 'S', 100, 3),
(2, '1001', 1, 'ST-POLO-2025', '101', 'M', 100, 3);

-- Bundling (Size S: 100 pcs -> 5 bundles of 20)
INSERT INTO bundling (bundle_id, cutting_id, style_id, colour_code, size, qty, starting_no, ending_no) VALUES
(1, 1, 'ST-POLO-2025', '101', 'S', 20, 1, 20),
(2, 1, 'ST-POLO-2025', '101', 'S', 20, 21, 40),
(3, 1, 'ST-POLO-2025', '101', 'S', 20, 41, 60),
(4, 1, 'ST-POLO-2025', '101', 'S', 20, 61, 80),
(5, 1, 'ST-POLO-2025', '101', 'S', 20, 81, 100);

-- 7. TRACKING (WIP)

-- Bundle 1: Completed Operations 1 & 2
INSERT INTO bundle_tracking_op_wise (bundle_id, operation_id, operator_id, part_id, starting_no, ending_no, status, start_time, completed_time) VALUES
(1, 1, 'EMP-OP-01', 1, 1, 20, 'COMPLETED', NOW() - INTERVAL '2 hour', NOW() - INTERVAL '1 hour'),
(1, 2, 'EMP-OP-02', 1, 1, 20, 'IN_PROGRESS', NOW() - INTERVAL '30 minute', NULL);

-- Bundle 2: Stuck at Op 1
INSERT INTO bundle_tracking_op_wise (bundle_id, operation_id, operator_id, part_id, starting_no, ending_no, status, start_time) VALUES
(2, 1, 'EMP-OP-01', 1, 21, 40, 'IN_PROGRESS', NOW() - INTERVAL '10 minute');


-- 8. RESET SEQUENCES
-- Essential to prevent collision on future inserts
SELECT setval('departments_department_id_seq', (SELECT MAX(department_id) FROM departments));
SELECT setval('designations_designation_id_seq', (SELECT MAX(designation_id) FROM designations));
SELECT setval('blocks_block_id_seq', (SELECT MAX(block_id) FROM blocks));
SELECT setval('shifts_shift_no_seq', (SELECT MAX(shift_no) FROM shifts));
SELECT setval('lines_line_no_seq', (SELECT MAX(line_no) FROM lines));
SELECT setval('machines_machine_id_seq', (SELECT MAX(machine_id) FROM machines));
SELECT setval('operation_master_operation_id_seq', (SELECT MAX(operation_id) FROM operation_master));
SELECT setval('parts_book_part_id_seq', (SELECT MAX(part_id) FROM parts_book));
SELECT setval('cutting_cutting_id_seq', (SELECT MAX(cutting_id) FROM cutting));
SELECT setval('bundling_bundle_id_seq', (SELECT MAX(bundle_id) FROM bundling));

-- End of Seed
