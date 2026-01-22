# Garments ERP - Development Guide

## Project Overview
This project is a comprehensive Enterprise Resource Planning (ERP) system designed specifically for the Garment Manufacturing industry. It digitizes the entire production lifecycle from Order Entry to Finishing, utilizing RFID technology for real-time tracking.

## Technology Stack
*   **Database**: PostgreSQL
*   **Extensions**: TimescaleDB (for time-series data), UUID-OSSP
*   **Backend Logic**: Built largely within the database using relational integrity, triggers, and complex queries, supported by a Node.js application layer (planned/implied).

## Database Architecture
The core of this system is a robust relational database schema.
**[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - **READ THIS FIRST**.
It contains detailed explanations of every table, column, Primary Key, and Foreign Key relationship.

### Key Modules
1.  **Order Management**: `orders`, `order_qty_cat1` (Size breakdown).
2.  **HR & Infrastructure**: `employees`, `departments`, `designations`, `lines`, `blocks`, `shifts`.
3.  **Assets**: `machines`, `machine_services`.
4.  **Industrial Engineering (IE)**: `style_master`, `operation_master`, `operator_master`, `size_cat1_op_sam_seam`.
5.  **Production Flow**: `cutting`, `bundling`, `bundle_tracking_op_wise`.
6.  **Security**: `app_users`, `permissions`, `role_permissions` (See `auth_schema.sql`).

## Software Architecture
For the application codebase (Node.js + React), please refer to the dedicated architecture logic:
*   **Architecture & Design**: **[FULL_STACK_ARCHITECTURE.md](./FULL_STACK_ARCHITECTURE.md)**
*   **Folder Structure & Rules**: **[PROJECT_STRUCTURE_RULES.md](./PROJECT_STRUCTURE_RULES.md)**

### Setup Instructions
To set up the development environment:

1.  **Initialize Database**:
    Run `schema.sql` (or `erp_schema_refinement.sql`) to create the table structures.
    ```sql
    \i schema.sql
    ```

2.  **Seed Data**:
    Run `seed_data.sql` to populate the database with realistic test data (Employees, Machines, Orders, Bundles).
    ```sql
    \i seed_data.sql
    ```

3.  **Setup Security**:
    Run `auth_schema.sql` to initialize users and permissions.
    ```sql
    \i auth_schema.sql
    ```

## Development Workflow
1.  **Schema Refinement**: Changes to the database structure are tracked in `erp_schema_refinement.sql`.
2.  **Architecture Documentation**: Always refer to `GARMENTS_ERP_ARCHITECTURE.md` before modifying table relationships.
3.  **Key constraints**:
    *   **Bundle Integrity**: Ensure that `(ending_no - starting_no) + 1` matches the bundle quantity.
    *   **Line Assignment**: Machines and Employees must be assigned to valid Lines.

## Contributing
*   Ensure all new tables have appropriate Primary Keys and Foreign Keys.
*   Update `seed_data.sql` if you introduce new required master data.
