# System Implementation Log & Architecture Guide

This document details the step-by-step implementation of the Garments ERP system, covering architectural decisions, backend logic, and frontend flows.

---

## 1. Core Architecture & Security

### Technology Stack
*   **Backend**: Node.js + Express (REST API).
*   **Database**: PostgreSQL (Relational Data + Transactions).
*   **Frontend**: React + Vite (TailwindCSS for styling).
*   **Authentication**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

### Layered Design Pattern
To ensure scalability and maintainability, the backend is strictly divided into three layers:
1.  **Controllers**: Handle HTTP requests, validate input, and send responses.
    *   *Example*: `authController`, `orderController`.
2.  **Services**: Contain business logic, complex calculations, and multiple repository calls.
    *   *Example*: `masterService`, `orderService`.
3.  **Repositories**: Execute raw SQL queries and interact directly with the database.
    *   *Example*: `userRepo`, `orderRepo`, `masterRepo`.

### Security Implementation
*   **RBAC Middleware**: A custom middleware (`requirePermission`) protects routes (e.g., only `IT_MANAGER` can access `/it/orders`).
*   **Whitelisting**: Backend strictly filters input fields to prevent mass assignment vulnerabilities.
*   **Transactions**: Critical operations (like creating an Order) use Database Transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) to ensure data consistency.

---

## 2. Authentication & User Management

### Implementation Steps
1.  **Employee ID Enforcement**:
    *   Modified `authController` to ensure every Sign Up is linked to a valid `Employee ID`.
    *   Added a `UNIQUE` constraint to the `app_users` table to prevent multiple accounts for one employee.
2.  **Login Flow**:
    *   Users log in with Username/Password.
    *   System fetches their **Role** and **Permissions** (e.g., `MANAGE_ORDERS`) from the database.
    *   These permissions are embedded in the JWT token for stateless verification.

---

## 3. HR Module (Employee Management)

### Logic
*   **Objective**: Allow HR to manage the workforce hierarchy.
*   **Features Integrated**:
    *   Employee Registration (linked to Departments/Designations).
    *   Department & Designation Master management.
    *   **Duplicate Checks**: Prevents creating two departments with the same name.

---

## 4. IT Module: Order Management (Critical Feature)

This module handles the creation of Production Orders and is the most complex part of the system due to **Dynamic Sizing**.

### A. Master Data Management
We implemented a robust system to manage `Styles`, `Colors`, `Age Groups`, `Categories`, and `Size Categories` on the fly.

*   **Inline Add Feature**:
    *   Inside the "Create Order" form, users can click a **(+)** button next to any dropdown.
    *   This opens a specific **Modal** (e.g., "Add Style").
    *   Upon saving, the backend creates the record, and the frontend **automatically selects** it.
*   **Linked Data**:
    *   **Colors** are strictly linked to **Styles**. Creating a specific color (e.g., "Vintage Red") ties it to the selected Style ID (e.g., "ST-2025").

### B. Dynamic Size Logic (The Core Innovation)
The system does *not* use a fixed table for order quantities. Instead, it adapts to the **Size Category**.

**The Rules:**
1.  **One Category = One Table**:
    *   If a user creates a Size Category named `Men Top`, the system automatically generates a database table named `order_qty_men_top`.
    *   If they create `Kids Wear`, it generates `order_qty_kids_wear`.
2.  **Deterministic Naming**:
    *   The backend converts the user-friendly name to a safe table name (Lowercase + Underscores).

**Workflow:**
1.  **User Action**: User creates a new Size Category: `Teen Fit` with sizes `XS, S, M, L`.
2.  **Backend Action**:
    *   Inserts record into `size_categorys`.
    *   Executes `CREATE TABLE order_qty_teen_fit (...)` with columns `xs`, `s`, `m`, `l`.
3.  **Order Submission**:
    *   When an order is placed using `Teen Fit`, the `OrderService` dynamically calculates the table name (`order_qty_teen_fit`).
    *   It inserts the quantities into that specific table.

### C. Edit Size Category (Schema Migration)
We implemented an advanced feature to **Append Sizes** to an existing category.

1.  **UI**: User clicks the **(Pencil)** icon next to a category.
2.  **Modal**: Shows current sizes (`XS, S`) as read-only tags. User inputs new sizes (`XL`).
3.  **Backend**:
    *   Updates the master record.
    *   Executes `ALTER TABLE ... ADD COLUMN xl ...` on the fly.
    *   **Result**: The grid immediately updates to show the `XL` column, and data integrity is preserved.

---

## 5. Frontend UI/UX Decisions

### Order Create Form
*   **Searchable Dropdowns**: Implemented a custom component (`SearchableSelectWithAdd`) that combines a Select box, an Edit button, and an Add button in a non-overlapping layout.
*   **Dynamic Grid**: The quantity input grid renders input boxes based *strictly* on the configuration of the selected Size Category.
*   **Auto-Fill**: Selecting a Style automatically fetches and fills its associated **Brand**, reducing manual entry.

---

## Summary of Database Schema Changes
To support these features, the following authorized changes were made:

1.  **`style_master`**: Added `brand` column.
2.  **`age_groups`**: Added `age` (range) column.
3.  **`size_categorys`**: Added `sizes` (CSV string) column.
4.  **Dynamic Tables**: `order_qty_*` tables are created programmatically.

This architecture ensures the system is **scalable** (unlimited size structures), **secure** (RBAC), and **user-friendly** (Inline Adds/Edits).
