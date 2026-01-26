# Document: IE Line Management Module Reconstruction

## 1️⃣ WHAT WAS IMPLEMENTED
### Features Added:
- **Style Filtering (Cutting Dependency)**: Styles in the Line Setup form are now filtered to show only those for which cutting has already started.
- **Role-Based Employee Categorization**:
    - **Supervisor**: Fetched from Production Department (ID 1) with Supervisor Designation (ID 2).
    - **IE Team**: Fetched from IE Department (ID 4).
    - **QC Team**: Fetched from Quality Department (ID 2).
    - **Feeding Helpers**: Fetched from Production Department (ID 1) with "Feeding Helper" Designation (ID 10).
- **Multi-Employee Assignment**: Enabled multi-selection for key management roles (Supervisor, IE, QC, Feeding Helper).
- **Multi-Line / Multi-Operation Working**: Integrated support for employees working across multiple lines or operations simultaneously via the `multi_work` extension.
- **Visible Assignment Badges**: employees already assigned to a line are highlighted with a badge showing their current assignment.

### Scope of the Change:
- **Backend (Services)**: Updated `IEService.js` logic for masters retrieval and line synchronization.
- **Frontend (UI)**: Overhauled the Line Configuration form in `IELinesPage.jsx` to support multi-select and enhanced status visualization.
- **Database Consistency**: Zero schema changes. Used existing `employees.working_line_no` for N-1 association and preserved the single-ID reference in `lines` columns for backward compatibility.

## 2️⃣ LOGIC & RULES APPLIED
- **Cutting-Started Condition**: Derived using `o.style_id IN (SELECT DISTINCT style_id FROM cutting)`. This ensures lines are only set up for styles actually nearing production.
- **The "First-Employee" Rule**: When multiple employees are assigned to a role (e.g., 3 Supervisors):
    - **Employees Table**: ALL 3 get `working_line_no` updated.
    - **Lines Table**: ONLY the ID of the first selected employee is stored in the `line_supervisor_id` column to satisfy existing schema constraints.
- **Atomic Sync**: Line creation/update and employee assignment are performed sequentially within the same transaction wrapper in the service layer.
- **Informational Assignment**: Selecting an already-assigned employee is permitted but visually flagged, allowing for flexible resource re-allocation.

## 3️⃣ DATA FLOW
1. **Masters Load**: `getIEMasters` returns a categorized `roleStaff` object.
2. **Form Interaction**: Users check/uncheck employees. The list reactively shows who is on other lines.
3. **Submission**: 
    - Frontend sends arrays of IDs for management roles.
    - Backend picks the 0-th element for the `lines` record.
    - Backend runs a bulk `UPDATE employees` for the entire combined set of IDs.

## 4️⃣ COMPONENT & FILE OVERVIEW
### Modified Files:
- **`server/src/services/ie/ieService.js`**:
    - `getIEMasters()`: categorize staff and filter styles.
    - `createLine(data)` & `updateLine(lineNo, data)`: Prepare payloads for Repo and trigger sync.
    - `_syncLineStaff(...)`: Atomic update for multiple employee IDs.
- **`client/src/features/ie/pages/IELinesPage.jsx`**:
    - Updated `formData` state.
    - Replaced single-selects with dynamic checkbox lists.
    - Added "Assigned" badges.
    - **v1.2**: Added search engine, available-first ordering, and "Clear Operation" logic.

## 5️⃣ REGRESSIONS & CONSTRAINTS
- **Existing Lines**: Previous assignments are preserved. Upon first edit, the system automatically detects all currently linked employees for the role categories based on their `working_line_no`.
- **The Zero-Value Indicator (Multi-Work)**: If an employee is assigned to more than one line:
    - `employees.working_line_no` is set to **0**.
    - Detailed assignments are stored in the `multi_work` table.
- **Designation-Based Rules**: Multi-operation work is limited to floor staff (Designation Level 7+). Management staff (Level < 7) are restricted to multi-line only.
- **Transactional Integrity**: Multi-work updates are managed atomically alongside existing line-staff sync logic.

## 6️⃣ LINE & OPERATION ASSIGNMENT ENHANCEMENTS (v1.2)
### Employee Filtering & Ordering:
- **Filtering**: Target pool restricted to **Production Department** with **Designation Level > 7** (strictly Operators and Tailors).
- **Ordering**: Available nodes (no active line or operation) appear first. Cross-line nodes (multi-work) follow.
- **Search**: Integrated real-time client-side search by Employee ID, Token ID, and Name.

### Assignment Flow:
- **Line Assignment**: Bulk selection and binding to the current line command. 
- **Operation Assignment**: Individual task metrics binding via modal. Integrated with multi-work rules.
- **De-assignment**:
    - **From Line**: Atomic unlinking via `UserMinus` action.
    - **From Operation**: Targeted "Clear Operation" functionality to reset task bounds.

### Technical Integrity:
- **State Sync**: Availability status updates immediately in the UI after every transaction.
- **Zero-Value Indicator**: Enforced during multi-assignment to ensure `0` correctly signals `multi_work` lookup.
- **Backward Compatibility**: Old single-assignment logic remains untouched; it simply occupies the first array slot in `multi_work` if needed.
