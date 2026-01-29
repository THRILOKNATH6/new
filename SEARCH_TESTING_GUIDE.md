# SEARCH TESTING GUIDE

## Test the Search Functionality

### 1. Login
- Username: `s mrket` or check your actual supermarket user
- Password: `55255`

### 2. Navigate to Supermarket Loading
- Click "Supermarket" in the sidebar
- Click "Create New Transaction" button

### 3. Step 1: Verify Employee
- Enter: `EMP-001`
- Click "Verify Credentials"
- Should show: "Thrilok" from Production Department

### 4. Step 2: Search Orders
Try these searches (type at least 3 characters):

**Search by Style:**
- Type: `AM3130`
- Should show: PO #1001 (AM3130 • COLUMBIA)

**Search by Order ID:**
- Type: `1001`
- Should show: PO #1001 (AM3130 • COLUMBIA)

**Search by Buyer:**
- Type: `COLUMBIA`
- Should show: PO #1001 (AM3130 • COLUMBIA)

### 5. Select Order
- Click on the order result
- Should show: "Active Selection: PO #1001 (AM3130)"
- Should display: Bundle Selection Grid below

### 6. Bundle Grid Should Show:
```
Available: 7 bundles
Bundles:
- #22 | XXS | 100 pcs
- #23 | XS  | 150 pcs
- #24 | S   | 200 pcs
- #25 | M   | 200 pcs
- #26 | L   | 200 pcs
- #27 | XL  | 200 pcs
- #28 | XXL | 100 pcs
```

### 7. Test Bundle Selection
- Click checkbox on any bundle
- Enter "Minus Qty" (e.g., 5)
- Select "Reason" (Damage/Missing)
- Observe "Final Qty" auto-calculates
- Check footer shows: "Total Selected: 1", "Total Damage: -5", "Net Loaded Qty: (original - 5)"

### 8. Complete Transaction
- Select at least 1 bundle
- Click "Commit to Approval"
- Should proceed to Step 3 (Approval)

---

## If Search Still Doesn't Work

Check browser console (F12) for errors and report the exact error message.
