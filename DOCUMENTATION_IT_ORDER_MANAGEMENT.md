# Document: IT Order Management Module Enhancement (Loading Tables)

## 1️⃣ WHAT WAS IMPLEMENTED
### Features Added:
- **Dynamic Loading Table Creation**: Automated creation of assignment tables (`loading_{size_category_name}`) whenever a new size category is defined or an order is created.
- **Idempotent Schema Management**: Integrated existence-check logic to prevent table duplication or structural conflicts.
- **Size Consistency**: Automatic synchronization of size columns in the loading tables to match the parent size category.

### Scope of the Change:
- **Backend (Repositories)**: Added `getLoadingTableName` and `ensureLoadingTable` to `MasterRepository.js`.
- **Backend (Services)**: Updated `OrderService.js` to ensure loading tables exist during `createOrder` and `updateOrder` workflows.
- **Database**: Introduced a new dynamic table pattern: `loading_{category_name}` with columns (`order_id`, `line_no`, and size-specific columns).

## 2️⃣ LOGIC & RULES APPLIED
- **Table Existence Rule**: Every table creation or column addition uses `IF NOT EXISTS` (SQL) or `information_schema` checks (Javascript) before execution. This ensures existing data is never overwritten or corrupted.
- **Primary Key Structure**: The `loading_{category}` tables use a composite primary key of `(order_id, line_no)` to track unique line assignments per order.
- **Old Logic Integrity**: 
    - Existing `order_qty_{category}` creation logic was preserved without modification.
    - Existing `size_{category}_op_sam_seam` creation logic was preserved without modification.
    - All existing database schemas remain unchanged.

## 3️⃣ DATA FLOW
1. **Category Creation**: 
    - `MasterRepo.createSizeCategory` triggers.
    - Resolves `loading_{category}` name via `getLoadingTableName`.
    - Initializes structure via `ensureLoadingTable`.
2. **Order Creation**:
    - `OrderService.createOrder` triggers.
    - Resolves size category definition.
    - Ensures all three dynamic tables (`order_qty_`, `size_..._op_sam_seam`, `loading_`) are ready before inserting order data.
3. **Size List Update**:
    - `MasterRepo.addSizesToCategory` triggers.
    - Appends new size columns to all three dynamic tables while preserving existing data.

## 4️⃣ COMPONENT & FILE OVERVIEW
### Modified Files:
- **`server/src/repositories/it/masterRepo.js`**:
    - `getLoadingTableName(categoryName)`: Helper for deterministic naming.
    - `ensureLoadingTable(client, tableName, sizes)`: Idempotent table engine.
    - `createSizeCategory(...)`: Integrated loading table initialization.
    - `addSizesToCategory(...)`: Integrated loading table synchronization.
- **`server/src/services/it/orderService.js`**:
    - `createOrder(...)`: Added `ensureLoadingTable` safety call.
    - `updateOrder(...)`: Added `ensureLoadingTable` safety call.

## 5️⃣ REGRESSIONS & CONSTRAINTS
- **Zero Refactoring**: No existing functions were renamed or moved. The new logic was added as discrete extension points.
- **Schema Safety**: The `order_id` in loading tables is not hard-encoded with a foreign key in the `ensure` logic (consistent with existing qty table patterns) to allow for flexible migration/cleanup, though it logically references `orders.order_id`.
