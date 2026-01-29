# SUPERMARKET MANAGEMENT - UPDATED IMPLEMENTATION SPECIFICATIONS

**Version**: 2.2 (Bundle Management & Qty Editing)
**Date**: 2026-01-28
**Status**: PENDING SCHEMA APPROVAL

---

## 5. BUNDLE MANAGEMENT (STEP 2 ENHANCEMENT)

### A. Manual Bundle Selection Logic
Instead of just entering quantities, the user can now search and select specific bundles.

1.  **Search Filters**:
    - **Keys**: Style, PO / Order ID, Colour, Size.
    - **Logic**: AND conditions.
    - **Source**: `bundling` table.

2.  **Availability Check**:
    - **Rule**: A bundle is "Available" if its `bundle_id` does NOT exist in the `loading_{category}_bundles` table.
    - **Display**: Grouped by Style/Colour/Size -> List of Bundles.

### B. Quantity Editing Rules
For each selected bundle, the user can perform "Minus Adjustment".

- **Fields**:
  - `Original Qty`: Read-only (from `bundling.qty`).
  - `Minus Qty`: User input (Default 0).
  - `Reason`: Enum (Missing, Damage, Other) - Required if Minus Qty > 0.
  - `Final Qty`: Auto-calculated (`Original - Minus`).

- **Constraints**:
  - `Minus Qty` <= `Original Qty`.
  - `Final Qty` >= 0.
  - Total Transaction Quantity = Sum of all `Final Qty`s.

### C. Updated Functionality Flow

1.  **User searches** items.
2.  **User Multi-selects** bundles from the result list.
3.  **User edits** "Minus Qty" for damaged items directly in the selection grid.
4.  **System validates** totals and saves:
    - Master Record via `createTransaction` (Total Qty).
    - Detail Records via `loading_{cat}_bundles` (Individual Bundle Info).

---

*(Previous sections 1-4 remain valid)*
