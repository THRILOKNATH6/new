# COMPLETE LOADING TRANSACTION TEST GUIDE

## Pre-Test Verification
✅ Database has Order 1001 (Style: AM3130, Buyer: COLUMBIA)
✅ 7 Bundles exist (IDs: 22-28)
✅ Employee EMP-001 exists (Thrilok, Production Department)
✅ All endpoints are running on localhost:5173 (frontend) and localhost:5000 (backend)

---

## STEP-BY-STEP TESTING PROCEDURE

### 1. LOGIN
**URL**: http://localhost:5173
- **Username**: `s mrket` (or your actual supermarket username)
- **Password**: `55255`
- **Expected**: Redirect to Dashboard

### 2. NAVIGATE TO SUPERMARKET
- Click **"Supermarket"** in the sidebar
- **Expected**: See "Supermarket Handover Dashboard" page
- **Expected**: See metrics showing transactions, pending approvals, etc.

### 3. START NEW TRANSACTION
- Click **"Create New Transaction"** button (top right)
- **Expected**: Modal opens showing "Initialize Loading Transaction"
- **Expected**: Progress bar shows Step 1 of 4

---

## STEP 1: EMPLOYEE VERIFICATION

**Input**: `EMP-001`
**Action**: Press Enter or click "Verify Credentials"

**Expected Results**:
✅ Green success box appears
✅ Shows: "Thrilok"
✅ Shows: "Production Supervisor • Production Department" (or similar)
✅ Button changes to "Access Granted - Proceed"

**Action**: Click "Access Granted - Proceed"
**Expected**: Progress advances to Step 2

---

## STEP 2: LINE & BUNDLE SELECTION

### 2A. Select Line
**Action**: Click "Target Production Line" dropdown
**Expected**: Shows list of ACTIVE lines (Line 1, Line 2, etc.)
**Action**: Select **"Line 1"** (or any active line)
**Expected**: System shows "ANALYZING LINE HISTORY..." briefly

### 2B. Search Order
**Location**: "Manual Order Selection" search box
**Action**: Type `AM3130` (or `1001` or `COLUMBIA`)
**Expected**: 
- Dropdown appears below search box
- Shows: "PO #1001" with "AM3130 • COLUMBIA"

**Action**: Click on the order result

### 2C. Bundle Selection Grid Appears
**Expected Display**:
```
Active Selection: PO #1001 (AM3130)
[Clear Selection button on right]

Bundle Selection Grid:
- Header shows: "Available: 7" and "Selected: 0"
- Table with columns: [✓] | Bundle ID | Size | Available Qty | Damage/Minus | Reason | Final Qty
- 7 rows of bundles:
  #22 | XXS | 100
  #23 | XS  | 150
  #24 | S   | 200
  #25 | M   | 200
  #26 | L   | 200
  #27 | XL  | 200
  #28 | XXL | 100
```

### 2D. Select Bundles
**Action**: Click checkbox on Bundle #22 (XXS)
**Expected**: 
- Row highlights in blue
- "Selected: 1" updates
- Damage/Minus input becomes active

**Action**: Click checkbox on Bundle #23 (XS)
**Expected**: "Selected: 2"

### 2E. (Optional) Add Damage Quantity
**Action**: In Bundle #22 row, type `5` in "Damage/Minus" column
**Expected**: 
- Input accepts the number
- "Final Qty" column updates to `95` (100 - 5)
- "Reason" dropdown becomes active

**Action**: Select "Damaged Piece" from Reason dropdown
**Expected**: Reason is saved

**Footer Expected**:
- Total Selected: 2
- Total Damage: -5
- Net Loaded Qty: 245 (95 + 150)

### 2F. Commit to Approval
**Action**: Click **"Commit to Approval"** button (bottom right)
**Expected**: 
- Loading spinner appears briefly
- Progress advances to Step 3

---

## STEP 3: APPROVAL

**Display**:
- Title: "Supermarket Authorization"
- Shows transaction review box with:
  - Order Details: #1001 (AM3130 / 100)
  - Destination: LINE 1
  - Quantities Allocated: XXS: 95, XS: 150 (or whatever you selected)

**Input**: Enter approver Employee ID (e.g., `EMP-001` or any Level 1-7 employee)
**Action**: Press Tab or click outside input
**Expected**: 
- Green box appears showing approver details
- "Confirm Authorization" button becomes active

**Action**: Click **"Confirm Authorization"**
**Expected**: Progress advances to Step 4

---

## STEP 4: HANDOVER

**Display**:
- Title: "Production Handover"
- Optional: "Alternative Running Style" input (leave blank for now)

**Input**: Enter Production employee ID (e.g., `EMP-001`)
**Action**: Press Tab or click outside
**Expected**: 
- Green box shows employee details
- "Complete Final Loading" button becomes active

**Action**: Click **"Complete Final Loading"**
**Expected**:
- Success! Modal closes
- Dashboard refreshes
- New transaction appears in "Handover Transaction Ledger"
- Status shows "COMPLETED"

---

## VERIFICATION AFTER COMPLETION

### Check Dashboard
✅ "Total Transactional Force" count increased by 1
✅ New row in ledger table showing:
  - TX ID: #LST-0001 (or next number)
  - Order Info: PO #1001 (AM3130 • 100)
  - Destination: LINE 1
  - Stage Status: COMPLETED
  - Activity Log: Shows creator → approver → handover names

### Check Database
Run this query to verify:
```sql
SELECT * FROM loading_xxs_xxl ORDER BY loading_id DESC LIMIT 1;
```
Expected: New record with your transaction data

```sql
SELECT bundle_id, loading_tx_id, minus_qty, minus_reason, final_qty 
FROM bundling 
WHERE bundle_id IN (22, 23);
```
Expected: 
- Bundle #22: loading_tx_id = 1, minus_qty = 5, final_qty = 95
- Bundle #23: loading_tx_id = 1, minus_qty = 0, final_qty = 150

---

## TROUBLESHOOTING

### If Search Returns No Results
1. Open Browser Console (F12)
2. Look for `[BundleGrid]` log messages
3. Check for errors in Network tab
4. Verify you're logged in (check for auth token)

### If Bundles Don't Appear
1. Check console for `[BundleGrid] Fetching bundles for orderId: ...`
2. Verify orderId is correct (should be 1001)
3. Check `[BundleGrid] Available bundles:` count
4. If count is 0, bundles might already be loaded

### If "Commit to Approval" is Disabled
- Ensure at least 1 bundle is selected (checkbox checked)
- Check that "Selected: X" shows > 0

---

## SUCCESS CRITERIA
✅ All 4 steps complete without errors
✅ Transaction appears in dashboard ledger
✅ Database records created correctly
✅ Selected bundles are marked as used (loading_tx_id set)
✅ Damage quantities recorded accurately

---

**Please test and report any issues at each step!**
