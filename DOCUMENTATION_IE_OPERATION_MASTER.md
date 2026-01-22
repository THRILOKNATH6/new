# Document: IE Operation Master & Audit System Implementation

## 1️⃣ WHAT WAS IMPLEMENTED
### Features Added:
- **Operation Master Dashboard**: A dynamic CRUD interface for managing manufacturing operations across any size category.
- **Dynamic Schema Evolution**: Automated backend logic to create and update `size_{category}_op_sam_seam` tables.
- **Audit System**: Mandatory tracking of record creation and modification history.
- **Migration Engine**: A standalone script to correct legacy data types across all existing manufacturing tables.

### Scope of the Change:
- **Backend**: New Repository (`OperationRepository.js`), expanded Service (`IEService.js`), updated Controller (`IEController.js`), and documented Routes (`ieRoutes.js`).
- **Frontend**: New feature page (`IEOperationsPage.jsx`), updated API service (`ieService.js`), and navigation integration.
- **Database**: Structural shift from measurement-based columns to unit-count-based columns (`INTEGER`).

### Role-Wise Access:
- **IE Manager**: Full Read/Create/Update access. Delete access restricted to their own records or as a manager.
- **System Admin**: Unrestricted access.
- **Other Roles**: No visibility or access to these management tools.

## 2️⃣ LOGIC & RULES APPLIED
- **Size Column Logic**: Size columns represent **Numeric Unit Counts** (how many of a certain unit are required for that operation at that size). They are strictly `INTEGER`.
- **SAM Precision**: The `sam` (Standard Allowed Minutes) value is stored as a high-precision decimal `numeric(5,3)` to ensure accurate time study standards.
- **Deletion Rule**: A record can only be deleted if the `created_by` employee ID matches the current user OR if the user holds the `IE Manager` designation.
- **Immutability**: `created_by` is set on insertion and can never be modified by update requests.

## 3️⃣ DATA FLOW & PATHS
### CRUD Flow:
1. **Selection**: UI requests size categories and styles via `IEService.getIEMasters()`.
2. **Fetch**: UI calls `GET /api/ie/operations?sizeCategoryId=...&styleId=...`.
3. **Execution**: 
    - `IEController` extracts parameters.
    - `IEService` resolves the table name using `MasterRepo`.
    - `OperationRepo` executes dynamic SQL with double-quoted identifiers to handle special characters.
4. **Data Persistence**:
    - **Create**: Inserts record with `created_by` and `last_changed_by` from `req.user.employeeId`.
    - **Update**: Modifies non-key fields and updates `last_changed_by`.
    - **Delete**: Performs permission check before executing `DELETE` query.

### Tables Used:
- `size_categorys`: To define available size sets.
- `style_master`: To link operations to garment styles.
- `size_{category_name}_op_sam_seam`: Dynamic tables where operation sequences are stored.

## 4️⃣ WHY THIS APPROACH WAS CHOSEN
- **Dynamic Table Strategy**: Using separate tables per size category prevents "mega-tables" with hundreds of nullable columns, improving query performance and indexing.
- **Integer Transition**: Representing sizes as counts rather than measurements (decimal) was chosen to align with production reality where operations often deal with discrete units or step-counts.
- **Centralized Schema Control**: Logic in `MasterRepository` ensures that no matter where a size category is created (IT or IE), the manufacturing tables are generated with consistent structure and audit fields.

## 5️⃣ SECURITY & DATA INTEGRITY
- **SQL Sanitization**: Dynamic table names are never accepted directly from user input without being passed through a resolution helper (`_resolveTable`) and a regex-based identifier sanitizer.
- **RBAC Middleware**: Every route is protected by `requirePermission('MANAGE_OPERATIONS')`.
- **Identity Theft Prevention**: Audit fields are populated using the server-side JWT context (`req.user.employeeId`), not from the request body.
- **Transaction Safety**: All modifications use PostgreSQL transactions. If a schema update fails during migration, the entire change is rolled back.

## 6️⃣ UI / UX BEHAVIOR
- **User Interface**: A high-fidelity "Glassmorphism" dashboard with a clear 3-step selection workflow (Category → Style → Action).
- **Dynamic Grid**: The table columns change in real-time based on the selected size category (e.g., Small/Medium vs 1X/2X).
- **Action Guarding**: The "Delete" button is conditionally rendered based on record ownership, mirroring the backend permission check.
- **Audit Tooltips**: History columns show the Employee ID of the creator and last modifier directly in the row.

## 7️⃣ LIMITATIONS & ASSUMPTIONS
- **No Free-Text Columns**: Size columns must remain numeric; they cannot be used for descriptive text flags.
- **Dependency**: Assumes `style_master` records exist before operations can be added.
- **Hardcoded SAM Table Prefix**: All manufacturing tables must follow the `size_..._op_sam_seam` naming convention.

## 8️⃣ FUTURE EXTENSIBILITY
- **Operation History**: The schema is prepared for a separate `audit_logs` table that could track *what* changed (old value vs new value) by linking to the `operation_id`.
- **Automatic SAM Calculation**: The system can be extended to calculate total garment SAM by summing sequences across these tables without refactoring the current data structure.
- **Machine Requirement Link**: The `machine_type` field can be linked to a machine inventory module in the future.
