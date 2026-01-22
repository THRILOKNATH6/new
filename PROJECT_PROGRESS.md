# Project Progress Documentation

## User Profile Management

1.  **Unique Identity Enforcement**
    *   **Objective**: Ensure one employee ID maps to strictly one user account.
    *   **Action**: Added unique constraint to `app_users.employee_id` and implemented backend validation to reject duplicate registration attempts.

2.  **Profile Features**
    *   **Objective**: Allow users to view and edit their profile.
    *   **Implementation**:
        *   Backend: Created `profileService` and `employeeRepo` to handle profile data.
        *   Security: Enforced strict read-only mode for sensitive fields like `emp_id`.
        *   Frontend: Built `ProfilePage` with avatar upload and editable contact details.

## Role-Based Access Control (RBAC)

1.  **Architecture**
    *   **Objective**: Secure data access based on user roles (Admin, HR, Supervisor, IE Manager).
    *   **Implementation**:
        *   Backend: Implemented `rbacMiddleware` to check permissions (`VIEW_HR_DATA`, `MANAGE_ORDERS`, `VIEW_ORDERS`, etc.).
        *   Frontend: Created dynamic `menuConfig` to hide/show sidebar items based on user permissions.

2.  **HR Module**
    *   **Objective**: Enable HR Managers to manage employees.
    *   **Implementation**:
        *   Backend layers: `hrController`, `hrService`, `hrRepo` created.
        *   Frontend: Built `HREmployeesPage`, `EmployeeList`, and `EmployeeForm`.
        *   Features: Add/Edit Employees, Manage Departments/Designations.
        *   Fixes: Resolved module path imports and SQL query errors.
        *   **Master Data**: Added Department and Designation management with duplicate prevention.

3.  **IT Module (Order Management)**
    *   **Objective**: Enable IT Managers to create Production Orders (PO) with dynamic master data and size categories.
    *   **Implementation**:
        *   **Transactional Integrity**: Implemented atomic creation of `orders` and dynamic `order_qty_<category>` tables using PostgreSQL transactions (`BEGIN/COMMIT`).
        *   **Dynamic Size Categories**:
            *   Implemented logic where `Size Category` determines the specific `order_qty_{name}` table (e.g., `order_qty_men_top`).
            *   Added **Edit Size Category** capability: Allows IT Managers to **Append** new sizes to an existing category. This triggers a backend schema migration (`ALTER TABLE ADD COLUMN`) and updates the master record atomically.
        *   **Master Data Management**: Implemented `MasterService` to handle creation of Styles (with Brand), Age Groups (with Age Range), and Size Categories (with CSV Sizes).
        *   **Frontend**: Built a refactored `OrderForm` with:
            *   **Searchable Dropdowns** for all master fields.
            *   **Inline Add & Edit Controls**: Dedicated non-overlapping buttons for Adding new records and Editing existing Size Categories.
            *   **Dynamic Grid**: Automatically renders input columns based on the selected Size Category's configuration, updating immediately after Edits.
        *   **Schema Updates**: Added `brand` to `style_master`, `age` to `age_groups`, and `sizes` to `size_categorys` to support enhanced logic.

4.  **IE Module (Industrial Engineering)**
    *   **Objective**: Provide IE Managers with filtered access to operations.
    *   **Implementation**:
        *   **Role Setup**: Created `IE Manager` designation and assigned `VIEW_ORDERS`, `VIEW_PRODUCTION_EMPLOYEES`, `MANAGE_LINES` permissions.
        *   **Line Management**: Implemented Full CRUD for `lines` table (Create, View, Update, Delete) via `IELinesPage` and specialized backend logical.
        *   **Filtered Views**:
            *   **production Staff**: IE Managers can view *only* employees in the Production Department.
            *   **Orders Read-Only**: IE Managers can view full order details/quantities but cannot edit them.
        *   **Security**: All filtering and access control enforced backend-side via Service logic and RBAC.

## Current State

*   **Backend**: Running secure REST API on port 5000.
*   **Frontend**: React Dashboard running on port 5173.
*   **Modules**: Auth, Profile, HR, IT, IE are functional.

## Next Steps

1.  **Production Module**: Implement Cutting and Bundling logic.
2.  **Machine Maintenance**: Implement module for Mechanics.
