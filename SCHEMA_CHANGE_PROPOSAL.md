# DATABASE SCHEMA CHANGE PROPOSAL
## Supermarket Loading - Bundle Level Tracking (Revised)

### 1. Objective
To support granular bundle selection, quantity editing, and availability tracking using the **existing `bundling` table** as requested.

### 2. Proposed Changes
We will modify the `bundling` table to directly store the loading status and adjustments. This avoids creating new tables.

**Target Table**: `bundling`

**New Columns**:
1.  `minus_qty` (INTEGER, Default 0): To store damaged/missing pieces count.
2.  `minus_reason` (VARCHAR): To store the reason (e.g., 'Damage', 'Missing').
3.  `final_qty` (INTEGER): To store the actual loaded quantity (`qty - minus_qty`).
4.  `loading_tx_id` (INTEGER): To link this bundle to a specific Loading Transaction ID.
5.  `loading_cat_name` (VARCHAR): To identify *which* loading table the transaction belongs to (Since loading tables are dynamic).

### 3. Logic Implication
*   **Availability**: A bundle is "Available" if `loading_tx_id` is NULL.
*   **Linking**: When Step 2 (Selection) is saved, we update the selected rows in `bundling` with the `loading_tx_id`.
*   **Handover**: The data is already persisted in `bundling`.

### 4. SQL Statement
```sql
ALTER TABLE bundling
ADD COLUMN IF NOT EXISTS minus_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minus_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS final_qty INTEGER,
ADD COLUMN IF NOT EXISTS loading_tx_id INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS loading_cat_name VARCHAR(50) DEFAULT NULL;

-- Index for faster availability search
CREATE INDEX IF NOT EXISTS idx_bundling_loading ON bundling(loading_tx_id);
```

### 5. Backward Compatibility
*   Existing records have `loading_tx_id = NULL`, so they appear "Available" by default. This is acceptable or they can be marked as legacy if needed.

---
**Requesting Approval to apply these changes to the `bundling` table.**
