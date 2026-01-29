# Supermarket Dashboard & Loading Transaction Management Plan

## 1. Objective
Create a Supermarket Dashboard module for the Supermarket department (ID 10) to manage a 4-step loading transaction workflow with multi-level approval and handover verification.

## 2. Access Control & Security
- **Dashboard Access**: Department = "Supermarket" (ID 10) AND Designation Level < 7.
- **Workflow Steps**:
    - **Step 1 (Verification)**: Any Supermarket staff.
    - **Step 2 (Selection)**: Any Supermarket staff. Recommendation logic automated.
    - **Step 3 (Approval)**: Supermarket staff (ID 10) AND Designation Level 1-7.
    - **Step 4 (Handover)**: Production staff (ID 1) AND Designation Level 1-7. 
        - Special Rule: If style changes, level must be ≤ 5.

## 3. Database Schema Extension (PROPOSAL)
We will extend the existing `loading_{size_category_name}` tables to support the transaction lifecycle and auditing.

### Table: `loading_{size_category_name}`
| Column | Type | Description |
| :--- | :--- | :--- |
| `loading_id` | SERIAL PRIMARY KEY | Unique ID for each loading transaction |
| `order_id` | INTEGER | FK to `orders` |
| `line_no` | INTEGER | FK to `lines` |
| `created_by` | VARCHAR(20) | Employee ID of initiator (Step 1/2) |
| `approved_by` | VARCHAR(20) | Employee ID of approver (Step 3) |
| `handover_by` | VARCHAR(20) | Employee ID of production staff (Step 4) |
| `approved_status` | VARCHAR(20) | PENDING_APPROVAL, APPROVED, COMPLETED |
| `created_date` | TIMESTAMP | Step 1 timestamp |
| `approved_date` | TIMESTAMP | Step 3 timestamp |
| `handover_date` | TIMESTAMP | Step 4 timestamp |
| `xxs, xs, s...` | INTEGER | Size-based quantities (Dynamic) |

### Impact Analysis
- **Migration Risk**: Low. Existing tables are empty. No data loss expected.
- **Backward Compatibility**: High. Surrogate key `loading_id` replaces composite PK `(order_id, line_no)`, allowing historical records.
- **Performance**: Negligible impact. Standard indexing on `line_no` and `order_id` will be maintained.

## 4. Workflows & Logic

### Recommendation Logic (Step 2)
Input: `line_no`.
1. **Fetch Last Loading**: Find the most recent `COMPLETED` transaction in any `loading_*` table for `line_no`. Extract `style_id`, `colour_code`, `order_id`.
2. **Recommendation Order**:
    - Match `order_id` in `cutting` table.
    - Match `style_id` + `colour_code` in `cutting` table (different order).
    - Match `style_id` in `cutting` table (any colour).
    - Fallback: Manual style selection.

### Dashboard Views
1. **Main View**: Completed transactions list + "New" button.
2. **Pending View**: Transactions waiting for Step 3 approval.

## 5. Implementation Steps
1. **Database**: Update dynamic table generation in `MasterRepository` and migrate existing tables.
2. **Backend**: 
    - `LoadingRepository`: Manage transaction state across dynamic tables.
    - `LoadingService`: Enforce business rules (Designation checks, Style change rules).
    - `LoadingController`: API endpoints for 4-step wizard.
3. **Frontend**:
    - Create `supermarket` feature directory.
    - `LoadingWizard`: 4-step UI component.
    - `SupermarketDashboard`: List and status tracking.

---
**Approval Required**: Please confirm if I should proceed with these schema changes and implementation.
