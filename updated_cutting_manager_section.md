### 5.3 Cutting Manager

**Designation**: Cutting Manager  
**Permissions**: `VIEW_ORDERS`, `MANAGE_CUTTING`

**Responsibilities**:
- View orders (read-only)
- Add cutting entries (lay-wise)
- View cutting progress vs order quantity
- Create bundles from cut quantities
- Manage bundle ranges and quantities
- Cannot exceed order quantity per size
- Cannot create bundles exceeding cut quantities

**Dashboard Access**:
- `/dashboard/production/cutting` - Order selection
- `/dashboard/production/cutting/:orderId` - Cutting entry and bundle management (tabbed interface)

**Backend Enforcement**:
```javascript
// cuttingService.js
async saveCutting(orderId, cuttingData, user) {
    // Validate: Total cut qty cannot exceed order qty
    const order = await OrderRepo.findById(orderId);
    const orderQty = await OrderRepo.getDynamicQty(order.size_category, orderId);
    const existingCut = await CuttingRepo.getExistingQty(orderId);
    
    for (const entry of cuttingData.cuttings) {
        const size = entry.size.toLowerCase();
        const totalCut = (existingCut[size] || 0) + entry.qty;
        
        if (totalCut > orderQty[size]) {
            throw new Error(`Cannot cut ${totalCut} for size ${size}. Order qty: ${orderQty[size]}`);
        }
    }
    
    return CuttingRepo.saveBatch(cuttingData);
}

// bundleService.js
async createBundle(bundleData, user) {
    // Validate: Bundle qty cannot exceed available cut qty
    const cutting = await CuttingRepo.findById(bundleData.cuttingId);
    const existingBundles = await BundleRepo.getByCuttingId(bundleData.cuttingId);
    const totalBundled = existingBundles.reduce((sum, b) => sum + b.qty, 0);
    
    if (totalBundled + bundleData.qty > cutting.qty) {
        throw new Error(`Bundle limit exceeded. Cut qty: ${cutting.qty}, Already bundled: ${totalBundled}`);
    }
    
    // Validate: (ending_no - starting_no) + 1 = qty
    const calculatedQty = (bundleData.endingNo - bundleData.startingNo) + 1;
    if (calculatedQty !== bundleData.qty) {
        throw new Error(`Bundle quantity mismatch: (${bundleData.endingNo} - ${bundleData.startingNo}) + 1 = ${calculatedQty}`);
    }
    
    return BundleRepo.create(bundleData);
}
```