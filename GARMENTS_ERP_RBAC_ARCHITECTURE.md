# Role-Based Architecture & Data Segregation Strategy

## 1. Overview
This document outlines the security architecture for the Garments ERP system. The system uses a **Single Source of Truth** approach where the backend enforces data visibility and access control based on granular permissions, not just high-level roles. This ensures scalability and security across multiple user types (Admin, Manager, Supervisor, etc.).

---

## 2. Core Concepts

### 2.1 Role Identification (The "Passport")
User identity and scope are established strictly upon login via the JWT (JSON Web Token).

*   **Token Payload (Source of Truth)**:
    ```json
    {
      "userId": "1001",
      "username": "john_doe",
      "role": "Supervisor",
      "employeeId": "EMP-001",
      "permissions": ["VIEW_DASHBOARD", "SCAN_BUNDLE", "VIEW_OWN_LINE"],
      "scope": {
        "blockId": 1,
        "lineNo": 5
      }
    }
    ```
*   **Security Principle**: The frontend treats the token as read-only. The backend verifies the signature on *every* request to ensure specific claims (like `lineNo: 5`) haven't been tampered with.

### 2.2 Access Control Logic (The "Guard")
We utilize **Permission-Based Access Control (PBAC)**. Instead of checking *who* the user is, we check *what* they can do.

*   **Logic**:
    *   Auth Middleware validates the Token.
    *   RBAC Middleware checks: `Does User have 'APPROVE_CUTTING' permission?`
    *   If yes -> Pass to Controller.
    *   If no -> Return `403 Forbidden`.

---

## 3. Data Segregation Strategy

The API returns different datasets for the same endpoint depending on the caller's context.

### 3.1 Row-Level Security (Horizontal Filtering)
**Scenario**: Fetching Orders.
*   **Admin**: Needs to see orders for ALL production lines.
*   **Supervisor**: Must ONLY see orders assigned to their specific line.

**Implementation Pattern**:
The Service layer injects "Scope Filters" into the Repository query based on the user's role.

```javascript
// Pseudo-code in OrderService.js
async getOrders(user) {
    const filters = {};
    
    // Admin sees everything (no filter)
    if (user.role === 'Admin') {
        // No-op
    } 
    // Supervisor is restricted to their line
    else if (user.role === 'Supervisor') {
        filters.lineNo = user.scope.lineNo; 
    }
    
    return OrderRepo.find(filters);
}
```

### 3.2 Column-Level Security (Vertical Filtering)
**Scenario**: Fetching Employee Details.
*   **HR Manager**: Can see `salary`, `bank_account`, `home_address`.
*   **Floor Manager**: Can see `name`, `shift`, `skill_level`. **Salary must be hidden.**

**Implementation Pattern**:
Defining "Projection Views" or filtering the JSON response before sending it.

```javascript
// EmployeeController.js
async getEmployee(req, res) {
    const rawData = await EmployeeService.getById(req.params.id);
    
    if (!req.user.permissions.includes('VIEW_SENSITIVE_HR_DATA')) {
        delete rawData.salary;
        delete rawData.bank_account;
    }
    
    res.json(rawData);
}
```

---

## 4. Dashboard Mapping Architecture

The Dashboard is a single, dynamic React application. It adapts its layout based on the config loaded at runtime.

### 4.1 Frontend Configuration
A central `menuConfig.js` maps permission codes to UI routes.

| Menu Item | Path | Required Permission |
| :--- | :--- | :--- |
| Dashboard | `/dashboard` | `VIEW_DASHBOARD` |
| HR Basics | `/dashboard/hr` | `VIEW_HR_DATA` |
| Machines | `/dashboard/machines` | `MANAGE_MACHINES` |
| Reports | `/dashboard/reports` | `VIEW_REPORTS` |

### 4.2 Dynamic Rendering Flow
1.  **Auth Context**: Decodes JWT and extracts `permissions` array.
2.  **Sidebar Component**: Iterates through `menuConfig.js`.
3.  **Filter**: `if (user.permissions.includes(item.permission)) render(Item)`
4.  **Result**: A Supervisor only sees "Dashboard" and "Scanner", while Admin sees the full suite.

---

## 5. Scalability & Maintainability

### Adding a New Role (e.g., "Quality Auditor")
1.  **Database**: Insert row into `designations` table.
2.  **Permissions**: Map existing permissions (e.g., `VIEW_REPORTS`, `VIEW_DASHBOARD`) to the new role in `role_permissions`.
3.  **Code**: **Zero changes required**. The system automatically grants access based on the new mapping.

### Adding a New Feature
1.  **Database**: Add `NEW_FEATURE` to `permissions` table.
2.  **Frontend**: Update `menuConfig.js` with the new route and permission.
3.  **Backend**: Add `requirePermission('NEW_FEATURE')` middleware to the new API routes.

---

## 6. End-to-End Example Flow

**User Scenario**: A Line Supervisor logs in to check their line's efficiency.

1.  **Login**: User submits credentials.
    *   Backend validates and finds user is `Supervisor` for `Line-05`.
    *   JWT issued with permissions: `['VIEW_DASHBOARD', 'VIEW_OWN_LINE']`.
2.  **Dashboard Load**:
    *   Frontend sidebar hides "HR" and "Admin" tabs.
    *   Main widget "Line Efficiency" is rendered.
3.  **API Call**: Frontend calls `GET /api/production/stats`.
4.  **Backend Processing**:
    *   **Auth Middleware**: Validates JWT signature.
    *   **Controller**: Extracts `lineNo: 5` from token scope.
    *   **Service**: Calls `ProductionRepo.getStats({ line_no: 5 })`.
    *   **Database**: Executes `SELECT * FROM daily_stats WHERE line_no = 5`.
5.  **Response**: Returns data specific to Line 5.
6.  **Display**: Supervisor sees "85% Efficiency" for their line only.
