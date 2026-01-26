# Garments Manufacturing ERP - System Architecture & Database Documentation

## 1. System Overview
 This document outlines the backend architecture, data flow, and **complete database schema** for the Garments Manufacturing ERP system. The system tracks production from Order Entry through Cutting, Bundling, and Line Production using RFID technology, alongside HR and Machine management.

---

## 2. Complete Database Schema (PostgreSQL)

The database `GARMENTS` is organized into several functional modules. Below is the detailed dictionary of all tables, columns, and indexes.

### A. Order Management Module

#### 1. `orders`
*Master table for Buyer Orders (PO).*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | `bigint` | **PK** | Unique Order Identifier |
| `buyer` | `varchar(100)` | | Buyer Name |
| `brand` | `varchar(100)` | | Brand Name |
| `season` | `varchar(50)` | | e.g. Summer 2025 |
| `oc` | `varchar(50)` | | Order Confirmation Number |
| `style_id` | `varchar(50)` | | Style Reference |
| `po` | `varchar(50)` | | Purchase Order Number |
| `country` | `varchar(50)` | | Destination Country |
| `colour_code` | `integer` | | Color ID/Ref |
| `age_group` | `integer` | | e.g. Kids, Adult |
| `category` | `integer` | | Product Category |
| `size_category`| `integer` | | Size Range ID |
| `order_quantity`| `integer` | | Total PO Quantity |
*   **Indexes**: `orders_pkey` (order_id)

#### 2. `order_qty_cat1`
*Size-wise breakdown for orders.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | `integer` | **PK** | Linked to `orders` |
| `xxs` | `integer` | Default 0 | Quantity for XXS |
| `xs` | `integer` | Default 0 | Quantity for XS |
| `s` | `integer` | Default 0 | Quantity for S |
| `m` | `integer` | Default 0 | Quantity for M |
| `l` | `integer` | Default 0 | Quantity for L |
| `xl` | `integer` | Default 0 | Quantity for XL |
| `xxl` | `integer` | Default 0 | Quantity for XXL |
*   **Indexes**: `order_qty_cat1_pkey` (order_id)

---

### B. HR & Factory Infrastructure Module

#### 3. `departments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `department_id` | `serial` | **PK** | |
| `department_name`| `varchar(100)`| Unique | e.g. Production, IE, Maintenance |

#### 4. `designations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `designation_id` | `serial` | **PK** | |
| `designation_name`| `varchar(100)`| Unique | e.g. Operator, Supervisor |
| `designation_level`| `integer` | | Hierarchy Level (1=Top) |

#### 5. `blocks`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `block_id` | `serial` | **PK** | |
| `unit_name` | `varchar(100)` | | e.g. Unit-A |
| `phase_no` | `varchar(20)` | | |
| `block_name` | `varchar(100)` | | e.g. Block-1 |

#### 6. `shifts`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `shift_no` | `serial` | **PK** | |
| `shift_name` | `varchar(50)` | | e.g. General, Night |
| `start_time` | `time` | | |
| `end_time` | `time` | | |

#### 7. `employees`
*Central table for all staff.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `emp_id` | `varchar(20)` | **PK** | e.g. EMP-001 |
| `qr_id` | `varchar(50)` | Unique | For ID Card Scanning |
| `token_no`| `varchar(50)` | Unique | |
| `name` | `varchar(100)` | | |
| `designation_id`| `integer` | FK | |
| `department_id` | `integer` | FK | |
| `block_id` | `integer` | FK | |
| `shift_no` | `integer` | FK | |
| `working_line_no`| `integer` | FK | Assigned Line |
| `status` | `varchar` | | ACTIVE, INACTIVE |
*   **Indexes**: `idx_emp_line`, `idx_emp_dept`, `idx_emp_status`, `idx_emp_qr`

#### 8. `lines`
*Production Lines.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `line_no` | `serial` | **PK** | |
| `line_name` | `varchar(50)` | Unique | e.g. Line-01 |
| `block_id` | `integer` | FK | Location |
| `running_style_id`| `varchar(50)` | FK | Current Style |
| `line_supervisor_id`| `varchar(20)` | FK | Employee ID |
| `line_ie_id` | `varchar(20)` | FK | Employee ID |
*   **Indexes**: `idx_lines_block`

---

### C. Machine & Asset Management

#### 9. `machines`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `machine_id` | `serial` | **PK** | |
| `qr_id` | `varchar(50)` | Unique | Asset Tag |
| `brand` | `varchar(50)` | | JUKI, BROTHER |
| `machine_type` | `varchar(50)` | | SNLS, DNLS |
| `line_no` | `integer` | FK | Current Location |
| `status` | `varchar` | | WORKING, BREAKDOWN |
| `guardian_id` | `varchar(20)` | FK | Responsible Mechanic |
*   **Indexes**: `idx_machines_line`, `idx_machines_status`, `idx_machines_qr`

#### 10. `machine_services`
*Maintenance History Log.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `service_id` | `serial` | **PK** | |
| `machine_id` | `integer` | FK | |
| `service_date`| `date` | | |
| `mechanic_id` | `varchar(20)` | FK | |
| `remarks` | `text` | | |

---

### D. Production Engineering (IE) & Masters

#### 11. `style_master`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `style_id` | `varchar(50)` | **PK** | Style Number |
| `style_name` | `varchar(100)` | | Description |

#### 12. `operation_master`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `operation_id` | `serial` | **PK** | |
| `operation_name`| `varchar(100)`| | |
| `index` `sequence_no`| `integer` | | Default Order |
| `standard_allowed_minutes`| `decimal` | | Base SAM |

#### 13. `operator_master`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `operator_id` | `varchar(20)` | **PK** | Employee ID Link |
| `operator_name` | `varchar(100)` | | |
| `skill_level` | `varchar(20)` | | Grade A, B, etc. |

#### 14. `size_cat1_op_sam_seam`
*Detailed operation bulletin per style.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `operation_id` | `serial` | **PK** | |
| `style_id` | `varchar(50)` | FK | |
| `operation_name`| `varchar(150)`| | |
| `operation_sequence`| `integer` | | |
| `sam` | `decimal` | | SAM for specific style |
| `machine_type` | `varchar(50)` | | Required Machine |
*   **Indexes**: `idx_ops_style`, `idx_ops_seq`

#### 15. `parts_book`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `part_id` | `serial` | **PK** | |
| `style_id` | `varchar(50)` | FK | |
| `part_name` | `varchar(50)` | | Front, Back, Sleeve |

---

### E. Production Transactions (Cutting to Finishing)

#### 16. `cutting`
*Fabric Cutting Records.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `cutting_id` | `serial` | **PK** | |
| `order_id` | `varchar` | | |
| `lay_no` | `integer` | | |
| `style_id` | `varchar` | FK | |
| `colour_code` | `varchar` | | |
| `size` | `varchar` | | |
| `qty` | `integer` | | Total pieces cut |
| `no_of_parts` | `integer` | | Parts per piece |
*   Constraint: `uniq_cutting_lay` (style, lay, color, size)

#### 17. `bundling`
*Generated Bundles from Cutting.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `bundle_id` | `serial` | **PK** | Unique RFID Target |
| `cutting_id` | `integer` | FK | |
| `style_id` | `varchar` | FK | |
| `colour_code` | `varchar` | | |
| `size` | `varchar` | | |
| `qty` | `integer` | | Items in bundle |
| `starting_no` | `integer` | | Sequence Start |
| `ending_no` | `integer` | | Sequence End |
*   **Indexes**: `idx_unique_bundle_start`

#### 18. `bundle_tracking_op_wise` (NEW)
*Detailed Operation-level Tracking.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `tracking_op_id`| `bigserial` | **PK** | |
| `bundle_id` | `integer` | FK | |
| `operation_id` | `integer` | FK | |
| `operator_id` | `varchar` | FK | Whodunit |
| `status` | `varchar` | | PENDING, IN_PROGRESS, COMPLETED |
| `start_time` | `timestamp` | | |
| `completed_time`| `timestamp` | | |
*   **Indexes**:
    *   `idx_tracking_status_operator`: Dashboard WIP
    *   `idx_tracking_bundle_id`: History Lookup
    *   `idx_tracking_op_status`: Bottleneck Analysis
    *   `idx_tracking_dates`: Reports

#### 19. `bundle_tracking` (Legacy/Simple)
*Gate-wise tracking (IN/OUT).*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `tracking_id` | `integer` | **PK** | |
| `bundle_id` | `integer` | | |
| `status` | `varchar(30)` | | Scan Point Name |
| `line_no` | `integer` | | |
| `starting_time` | `timestamp` | | |

#### 20. `garment_production_raw`
*Raw IoT/Machine Logs.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `machine_id` | `varchar` | | |
| `operator_id` | `varchar` | | |
| `recorded_at` | `timestamp` | | |
*   **Indexes**: Extensive indexing on time, machine, and operator for analytics.

#### 21. `multi_work` (NEW)
*Extension for employees assigned to multiple lines/operations.*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `emp_id` | `varchar(20)` | **PK**, FK | References `employees` |
| `multi_lines` | `integer[]` | | Array of line numbers |
| `multi_operations`| `integer[]` | | Array of operation IDs |
| `updated_at` | `timestamp` | | |

---

## 3. Database Functions

The database primarily uses standard PostgreSQL features.
*   **Extensions Enabled**: `timescaledb` (implied by internal functions), `uuid-ossp` (implied by UUID functions).
*   **System Functions**: ~106 functions including `to_uuidv7`, `timescaledb_pre_restore`, etc.
*   **User Functions**: Currently, business logic is handled via Application Layer (Node.js/Auth), using complex SQL queries for reporting (see Architecture section below).

---

## 4. Implementation Workflow & Architecture

### 4.1 Order Creation & Size Allocation
1.  **Order Entry**: Merchant creates an order in `orders`.
2.  **Size Breakdown**: Merchant defines quantities per size in `order_qty_cat1`.

### 4.2 Cutting Process
1.  **Lay Planning**: Cut master decides a "Lay".
2.  **Cutting Entry**: Records inserted into `cutting`.
    *   Constraint: Unique Lay+Size.
3.  **Parts**: System references `parts_book` for sticker generation.

### 4.3 Bundling & Tagging
1.  **Generation**: Bundles created in `bundling` table based on `qty` and `max_bundle_size` (e.g., 20).
2.  **RFID**: `bundle_id` is the physical RFID tag ID.

### 4.4 Production Tracking (RFID)
1.  **Scan**: Operator scans bundle at machine.
2.  **Track**: Record inserted into `bundle_tracking_op_wise`.
3.  **Real-time**: Dashboards query `status='IN_PROGRESS'` to show Live WIP.

### 4.5 Business Rules
*   **Bundle Integrity**: `(ending_no - starting_no) + 1` MUST EQUAL `qty`.
*   **Scan Deduplication**: Checked via timestamp difference in `bundle_tracking`.
*   **Line Validation**: `machines.line_no` vs `bundling.style_id` -> `lines.running_style_id`.

---

## 5. API Service Logic (Pseudo-code)

### 5.1 Dashboard Data Aggregation
To display **Order vs Cut vs Bundled vs WIP**:
*   **Ordered**: `SELECT SUM(order_quantity) FROM orders`
*   **Cut**: `SELECT SUM(qty) FROM cutting`
*   **Bundled**: `SELECT SUM(qty) FROM bundling`
*   **WIP**: `SELECT COUNT(*) FROM bundle_tracking_op_wise WHERE status = 'IN_PROGRESS'`
