# Garments ERP - Database Schema Documentation

## Overview
This document details the database schema for the Garments ERP system. The database is normalized to 3rd Normal Form (3NF) to ensure data integrity and reduce redundancy.

**Database Name**: `GARMENTS`
**RDBMS**: PostgreSQL

---

## 1. Authentication & Access Control
These tables manage who can access the system and what they can do.

### `app_users`
Stores login credentials for application access.
*   **Purpose**: Separates application logic (login) from HR logic (employees).
*   **Columns**:
    *   `user_id` (PK, Serial): Unique internal ID.
    *   `username` (String, Unique): Login name.
    *   `password_hash` (String): Securely hashed password (e.g., BCrypt).
    *   `employee_id` (FK -> `employees.emp_id`): Links to the physical person.
    *   `is_active` (Boolean): Master switch to disable access without deleting history.

### `permissions`
Catalog of all distinct actions a user can perform.
*   **Columns**:
    *   `permission_code` (PK, String): e.g., 'MANAGE_ORDERS'.
    *   `description`: Human-readable explanation.

### `role_permissions`
Maps Roles (Designations) to Permissions options.
*   **Purpose**: Defines the rules. "Managers can View Reports".
*   **Columns**:
    *   `designation_id` (FK -> `designations.designation_id`, PK Comp): The Role.
    *   `permission_code` (FK -> `permissions.permission_code`, PK Comp): The Allowed Action.

---

## 2. Infrastructure & HR
Represents the physical factory setup and workforce.

### `departments`
*   **Purpose**: Organizational grouping (Production, IE, HR).
*   **PK**: `department_id`

### `designations`
*   **Purpose**: Job titles and hierarchy levels.
*   **PK**: `designation_id`
*   **Key Column**: `designation_level` (Integer) - Lower number means higher rank (1 = GM, 10 = Helper). Used for hierarchy logic.

### `employees`
Central table for all staff members.
*   **PK**: `emp_id` (String, e.g., 'EMP-001').
*   **FKs**:
    *   `designation_id` -> `designations`
    *   `department_id` -> `departments`
    *   `block_id` -> `blocks` (Physical location)
    *   `shift_no` -> `shifts` (Timing)
    *   `working_line_no` -> `lines` (For production staff)
*   **Why**: Centralizing all staff allows easier HR reporting (payroll, attendance) compared to separate tables per role.

### `lines`
Represents a sewing line (a group of 20-40 machines).
*   **PK**: `line_no`
*   **Important FK**: `running_style_id` -> `style_master`. Tracks *what* is currently being made on this line.

---

## 3. Order Management
Tracks what the buyer wants us to make.

### `orders`
The Purchase Order (PO) Header.
*   **PK**: `order_id` (Bigint).
*   **Columns**: `buyer`, `style_id` (FK), `po`, `country`.
*   **Why**: Standard header-detail pattern.

### `order_qty_cat1`
The Size Breakdown (Detail).
*   **PK**: `order_id` (FK -> `orders`). 1-to-1 relationship.
*   **Columns**: `xxs`, `s`, `m`, `l`, `xl`... (Integers).
*   **Why**: Pivoting sizes into columns makes data entry easier, though a vertical structure (size, qty rows) is more flexible for dynamic sizes. Current design supports fixed standard sizes.

---

## 4. Production Engineering (IE)
Technical specifications for *how* to make the garment.

### `style_master`
Registry of unique garment styles.
*   **PK**: `style_id` (String, e.g., 'ST-POLO-2025').

### `operation_master`
Library of all possible sewing operations.
*   **PK**: `operation_id`.
*   **Columns**: `standard_allowed_minutes` (SAM). This is CRITICAL for calculating efficiency (Target vs Actual).

### `parts_book`
Defines the components of a garment.
*   **PK**: `part_id`.
*   **Columns**: `part_name` (Front, Back), `style_id` (FK).

---

## 5. Production Flow & Tracking (The Core)
This is the most complex part, handling high-volume transactional data.

### `cutting`
Records fabric cut from rolls.
*   **PK**: `cutting_id`.
*   **Constraint**: Unique index on `style_id` + `lay_no` + `colour` + `size`. A specific "Lay" implies a specific stack of fabric.

### `bundling`
Represents a physical stack of cut fabric pieces tied together.
*   **PK**: `bundle_id` (Integer - Acts as the **RFID Tag ID**).
*   **FK**: `cutting_id`.
*   **Columns**: `starting_no`, `ending_no`.
*   **Logic**: If `qty` is 20, pieces are numbered 1-20. This allows individual piece tracking if needed later.

### `bundle_tracking_op_wise` (Transaction Table)
**The Heart of the System**. Records every scan at every machine.
*   **PK**: `tracking_op_id` (BigSerial - expects millions of rows).
*   **Foreign Keys**:
    *   `bundle_id`: What is being sewn?
    *   `operation_id`: What step is this? (e.g., Sleeve Attach).
    *   `operator_id`: Who is doing it? (For Piece-rate wages).
*   **Status Management**:
    *   `status`: 'IN_PROGRESS' (Active WIP) vs 'COMPLETED'.
    *   `start_time`: When scan happened.
    *   `completed_time`: When next scan happened (or button press).
*   **Why**: This deep level of granularity allows us to see *exactly* where a bundle is, who has it, and how long they took.

---

## 6. Relationships Diagram (Textual)

```text
[Orders] 
   | (1:1)
   v
[Order Qty Breakdown]

[Style Master] <------- [Orders]
   ^
   | (1:N)
   v
[Operations]           [Employees] (Operators)
   ^                       ^
   | (M:1)                 | (1:M)
   |                       |
[Bundle Tracking] -------->+
   | (M:1)
   v
[Bundling]
   | (M:1) 
   v
[Cutting]
```

## 7. Key Mapping Summary

| Foreign Key | Source Table | Target Table | Purpose |
| :--- | :--- | :--- | :--- |
| `employee_id` | `app_users` | `employees` | links login to physical person |
| `running_style_id` | `lines` | `style_master` | Knows what style a line is producing |
| `style_id` | `orders` | `style_master` | Links PO to technical specs |
| `operator_id` | `bundle_tracking_op_wise` | `employees` | Calculates wages/efficiency |
| `operation_id` | `bundle_tracking_op_wise` | `operation_master` | Knows the difficulty (SAM for cost) |
