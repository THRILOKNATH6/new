# Garments ERP - Access Control & Security

## Overview
Security in the Garments ERP system is governed by a **Role-Based Access Control (RBAC)** model. This ensures that users only have access to the data and features necessary for their job functions.

## 1. Authentication Strategy
*   **Users Table**: A dedicated `app_users` table stores login credentials.
*   **Linkage**: Each user is linked to an `employee_id` in the HR system.
*   **Credentials**: Passwords must be hashed (e.g., BCrypt) before storage. NEVER store plain-text passwords.

## 2. Authorization Model
Access is determined by the **Designation** (Role) of the employee.

### Roles & Designations
The system uses the `designations` table as the source of truth for roles.
*   **Level 1 (Top Management)**: Factory Manager, GM.
*   **Level 2-4 (Mid Management)**: Production Manager, HR Manager.
*   **Level 5+ (Operational)**: Supervisors, Quality Inspectors, Mechanics.

### Permission Granularity
Permissions are defined as granular codes (e.g., `MANAGE_ORDERS`, `VIEW_SALARY`).
*   **Mapping**: The `role_permissions` table maps Designations to specific Permission Codes.
*   **Check**: When a user attempts an action, the system checks if their designation has the required permission.

## 3. Data Access Policies

| Role | Access Scope | key Permissions |
| :--- | :--- | :--- |
| **Factory Manager** | **Full Access**. Can view all financial, HR, and production data. | `SYSTEM_ADMIN`, `VIEW_HR_DATA` |
| **Production Manager**| **Operational Access**. Can create orders, view production reports. No access to salaries. | `MANAGE_ORDERS`, `APPROVE_CUTTING` |
| **HR Manager** | **HR Access**. Can manage employee records, salaries, and attendance. | `MANAGE_EMPLOYEES`, `VIEW_HR_DATA` |
| **Supervisor** | **Line Access**. Can view dashboards for their specific line only. | `VIEW_DASHBOARD`, `SCAN_BUNDLE` |
| **Mechanic** | **Asset Access**. Can update machine status and service logs. | `MANAGE_MACHINES` |

## 4. Implementation Details
To enforce these rules:
1.  **Run Schema**: Execute `auth_schema.sql`.
2.  **Middleware**: In the Node.js API, implement a middleware `verifyPermission('CODE')`.
3.  **Frontend**: Hide UI elements (Buttons, Menus) based on the current user's permission list.
