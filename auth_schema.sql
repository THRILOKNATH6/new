-- ==================================================================================
-- GARMENTS ERP - AUTHENTICATION & ACCESS CONTROL SCHEMA
-- ==================================================================================

-- 1. USERS & ROLES
-- Note: 'designations' table acts as the base for Roles, but we can refine permissions here.

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS app_users;

-- Application Users (Login Credentials)
CREATE TABLE app_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Store BCrypt hash
    employee_id VARCHAR(20) REFERENCES employees(emp_id) UNIQUE, -- Link to HR record, Must be UNIQUE
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Catalog (Granular capabilities)
CREATE TABLE permissions (
    permission_code VARCHAR(50) PRIMARY KEY, -- e.g., 'VIEW_SALARY', 'EDIT_ORDER'
    description VARCHAR(100)
);

-- Role-Permission Mapping
-- We map Designations (Roles) to Permissions
CREATE TABLE role_permissions (
    designation_id INTEGER REFERENCES designations(designation_id),
    permission_code VARCHAR(50) REFERENCES permissions(permission_code),
    PRIMARY KEY (designation_id, permission_code)
);

-- ----------------------------------------------------------------------------------
-- 2. SEED DATA - PERMISSIONS
-- ----------------------------------------------------------------------------------

-- Define available permissions
INSERT INTO permissions (permission_code, description) VALUES
('VIEW_DASHBOARD', 'View General Dashboard'),
('MANAGE_ORDERS', 'Create and Edit Buyer Orders'),
('APPROVE_CUTTING', 'Approve Cut Plans'),
('VIEW_HR_DATA', 'View Sensitive Employee Data (Salary)'),
('MANAGE_EMPLOYEES', 'Add/Edit Employee Records'),
('SCAN_BUNDLE', 'Perform RFID Scanning Operations'),
('VIEW_REPORTS', 'Download Production Reports'),
('MANAGE_MACHINES', 'Add/Edit Machine Assets'),
('VIEW_ORDERS', 'Read-only access to PO details'),
('MANAGE_CUTTING', 'Add/Update Cutting entries'),
('SYSTEM_ADMIN', 'Full System Access');

-- ----------------------------------------------------------------------------------
-- 3. SEED DATA - ROLE MAPPINGS
-- ----------------------------------------------------------------------------------

-- 1: PM (mapped to System Admin)
INSERT INTO role_permissions (designation_id, permission_code) VALUES 
(1, 'SYSTEM_ADMIN'), (1, 'VIEW_HR_DATA'), (1, 'VIEW_REPORTS'), (1, 'VIEW_ORDERS'), (1, 'MANAGE_CUTTING');

-- 2: Supervisor (mapped to Line Supervisor/Floor Incharge duties)
INSERT INTO role_permissions (designation_id, permission_code) VALUES
(2, 'VIEW_DASHBOARD'), (2, 'SCAN_BUNDLE'), (2, 'MANAGE_ORDERS');

-- 4: Mechanic (mapped to Machine Management)
INSERT INTO role_permissions (designation_id, permission_code) VALUES
(4, 'MANAGE_MACHINES');

-- 11: Cutting Manager (assuming ID 11 for Manager level in Cutting)
-- We must ensure this designation exists in seed_data.sql
INSERT INTO role_permissions (designation_id, permission_code) VALUES
(11, 'VIEW_DASHBOARD'), (11, 'VIEW_ORDERS'), (11, 'MANAGE_CUTTING');

-- ----------------------------------------------------------------------------------
-- 4. SEED DATA - USERS
-- ----------------------------------------------------------------------------------

-- Default accounts for testing (Password: 'password123' - hash to be generated in app)
-- Using EMP-003 (PM) for admin and EMP-001 (Supervisor) for supervisor account
INSERT INTO app_users (username, password_hash, employee_id, is_active) VALUES
('admin', '$2b$10$YourHashedPasswordHereFor123', 'EMP-003', TRUE), -- Sarah IE (PM)
('supervisor', '$2b$10$YourHashedPasswordHereFor123', 'EMP-001', TRUE), -- John Supervisor
('cutting', '$2b$10$YourHashedPasswordHereFor123', 'EMP-CUT-01', TRUE); -- Frank Cutting
