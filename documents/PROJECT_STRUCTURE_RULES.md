# Project Structure & Coding Standards

This document serves as the day-to-day reference for where to place code and the strict rules to follow.

---

## 1. Frontend Structure (`/client`)
We use a **Feature-Based** architecture. Code is organized by **Domain Feature**, not by file type.

### **The Map**
```text
/client/src
├── /components     # GLOBAL "Dumb" UI components (Button, Input, Card)
├── /config         # Environment variables and App-wide constants
├── /context        # Global Providers (Theme, AuthUser) - Use sparingly!
├── /features       # [IMPORTANT] All Business Logic lives here
│   ├── /auth       # Login, Register, Forgot Password
│   ├── /orders     # Order List, Order Create, Order Details
│   └── /tracking   # Bundle Scanning, Reports
├── /hooks          # Generic Hooks (useScroll, useWindowSize)
├── /layouts        # DashboardLayout, AuthLayout
├── /lib            # Configurations (Axios, Date-fns setup)
├── /pages          # Route Containers (Import features and arrange them)
└── /routes         # Router definitions
```

### **Frontend Rules**
1.  **Strict separation of UI and Logic**:
    *   **Page (`/pages`)**: No logic. It just imports things.
    *   **Feature (`/features`)**: Contains the logical components and API calls.
    *   **Component (`/components`)**: Pure UI. Receives props, renders HTML. No API calls here.
2.  **No Direct API calls**:
    *   Never call `axios.get()` inside a Component.
    *   Always define functions in `features/xxx/api/xxxService.js` and call those.
3.  **State Management**:
    *   Use **React Query / SWR** for server state (fetching data).
    *   Use **Context** only for global app state (Theme, User Session).
    *   Use **Local State (`useState`)** for form inputs.

---

## 2. Backend Structure (`/server`)
We use a **Layered (3-Tier)** architecture.

### **The Map**
```text
/server/src
├── /api
│   ├── /controllers  # 1. Handles HTTP Request/Response
│   ├── /routes       # URL definitions
│   └── /middlewares  # Validation, Auth checks
├── /services         # 2. BUSINESS LOGIC (The Brains)
├── /repositories     # 3. DATABASE ACCESS (SQL Queries)
├── /config           # DB connection, Env vars
└── /utils            # Helper functions (Logger, Error Classes)
```

### **Backend Rules**
1.  **The Controller Rule**:
    *   **NEVER** write SQL in a controller.
    *   **NEVER** write business logic (e.g., `if (price > 100)`) in a controller.
    *   **JOB**: Validate input -> Call Service -> Send Response.
2.  **The Service Rule**:
    *   **NEVER** take `req` or `res` as arguments. Services must be framework-agnostic.
    *   **JOB**: Implement rules, calculations, and orchestrate data flow.
3.  **The Repository Rule**:
    *   **JOB**: Execute SQL/ORM commands.
    *   If you change the database from SQL to Mongo, ONLY this folder changes.

---

## 3. Naming Conventions

| Type | Convention | Example |
| :--- | :--- | :--- |
| **Files (JS/TS)** | camelCase | `authService.js`, `orderController.js` |
| **React Components** | PascalCase | `LoginForm.jsx`, `PrimaryButton.tsx` |
| **Folders** | camelCase | `/components`, `/features` |
| **Database Tables** | snake_case | `order_details`, `user_logs` |
| **Env Variables** | UPPER_SNAKE | `JWT_SECRET`, `DB_HOST` |

## 4. Workflows

### **Adding a New Feature (e.g., "Inventory")**
1.  **Backend**:
    *   Create `repositories/inventoryRepo.js` (SQL).
    *   Create `services/inventoryService.js` (Logic).
    *   Create `api/controllers/inventoryController.js` (Endpoints).
    *   Add route to `api/routes/index.js`.
2.  **Frontend**:
    *   Create `features/inventory`.
    *   Add `api/inventoryService.js`.
    *   Add `components/InventoryList.jsx`.
    *   Create page `pages/InventoryPage.jsx`.
    *   Add route in `routes/AppRoutes.jsx`.
