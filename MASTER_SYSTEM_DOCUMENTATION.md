# GARMENTS ERP SYSTEM - MASTER DOCUMENTATION
## ENTERPRISE-GRADE PRODUCTION SYSTEM - SINGLE SOURCE OF TRUTH

**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Status**: PRODUCTION ACTIVE  
**Classification**: INTERNAL - SYSTEM ARCHITECTURE

---

## EXECUTIVE SUMMARY

This is the **definitive technical specification** for the Garments Manufacturing ERP system. This document serves as the **SINGLE SOURCE OF TRUTH** for all developers, architects, and stakeholders. Any modification to the system MUST reference and update this document.

### System Purpose
A full-stack, role-based ERP system for garment manufacturing that tracks the complete production lifecycle from order entry through cutting, bundling, and line production using RFID technology, alongside comprehensive HR and machine management.

### Technology Stack
- **Frontend**: React 18+ with Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL 14+ with dynamic table generation
- **Authentication**: JWT-based with BCrypt password hashing
- **Authorization**: Permission-Based Access Control (PBAC)

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │ Auth Context │  │ API Services │          │
│  │  (Features)  │  │   (JWT)      │  │   (Axios)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │  │ Auth Middleware│ │RBAC Middleware│         │
│  │              │  │  (JWT Verify)  │ │ (Permissions) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Controllers  │  │   Services   │  │ Repositories │          │
│  │ (HTTP I/O)   │  │ (Bus. Rules) │  │  (DB Access) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↕ SQL
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PERSISTENCE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │ Dynamic Tables│ │ Audit Logs   │          │
│  │   (GARMENTS) │  │ (Auto-Create) │ │ (Tracking)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Layered Architecture Pattern

**CRITICAL RULE**: All data flow MUST follow this pattern:
```
Route → Controller → Service → Repository → Database
```

**NEVER**:
- Call Repository directly from Controller
- Put business logic in Controllers or Repositories
- Mix concerns across layers

---

## 2. PROJECT STRUCTURE

### 2.1 Frontend Structure (`/client/src`)

```
client/src/
├── features/              # Feature-based modules (PRIMARY ORGANIZATION)
│   ├── auth/             # Authentication (Login, Register)
│   │   ├── api/          # authService.js
│   │   ├── components/   # LoginForm, SignupForm
│   │   └── pages/        # LoginPage, SignupPage
│   ├── dashboard/        # Main Dashboard
│   │   ├── components/   # DashboardLayout.jsx
│   │   └── config/       # menuConfig.js (RBAC menu)
│   ├── hr/               # Human Resources Module
│   │   ├── api/          # hrService.js
│   │   ├── components/   # EmployeeList, HRStats, HRMasters
│   │   └── pages/        # HREmployeesPage
│   ├── it/               # IT Manager Module (Order Management)
│   │   ├── api/          # orderService.js
│   │   ├── components/   # OrderForm, OrderList
│   │   └── pages/        # OrdersPage
│   ├── ie/               # Industrial Engineering Module
│   │   ├── api/          # ieService.js
│   │   ├── components/   # LineCard, OperationForm
│   │   └── pages/        # IELinesPage, IEOperationsPage
│   └── production/       # Production Module (Cutting)
│       ├── api/          # cuttingService.js
│       ├── components/   # CuttingForm, PercentagePanel
│       └── pages/        # CuttingDashboardPage, CuttingEntryPage
├── context/              # React Context (AuthContext)
├── pages/                # Shared pages (DashboardPage, ProfilePage)
├── components/           # Shared/global components
├── utils/                # Utilities (api.js - Axios instance)
└── index.css             # Global styles (Operational Design System)
```

**ORGANIZATIONAL PRINCIPLE**: Features are self-contained modules with their own API services, components, and pages.

### 2.2 Backend Structure (`/server/src`)

```
server/src/
├── api/
│   ├── controllers/      # HTTP request/response handlers
│   │   ├── authController.js
│   │   ├── hrController.js
│   │   ├── ieController.js
│   │   ├── itController.js
│   │   └── cuttingController.js
│   ├── middlewares/      # Request interceptors
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── rbacMiddleware.js    # Permission checking
│   │   └── uploadMiddleware.js  # File uploads
│   ├── routes/           # Route definitions
│   │   ├── authRoutes.js
│   │   ├── hrRoutes.js
│   │   ├── ieRoutes.js
│   │   ├── itRoutes.js
│   │   └── cuttingRoutes.js
│   └── validators/       # Input validation schemas
├── services/             # Business logic layer
│   ├── authService.js
│   ├── hrService.js
│   ├── ieService.js
│   ├── itService.js
│   └── cuttingService.js
├── repositories/         # Data access layer
│   ├── userRepo.js
│   ├── employeeRepo.js
│   ├── cuttingRepo.js
│   ├── hr/               # HR-specific repos
│   ├── ie/               # IE-specific repos
│   │   ├── lineRepo.js
│   │   ├── operationRepo.js
│   │   └── masterRepo.js
│   └── it/               # IT-specific repos
│       └── orderRepo.js
├── config/
│   └── db.js             # PostgreSQL connection pool
└── utils/
    └── errorHandler.js   # Centralized error handling
```

---

## 3. DATABASE ARCHITECTURE

### 3.1 Database Design Philosophy

**CRITICAL CONCEPTS**:
1. **Dynamic Table Generation**: Tables are created at runtime based on size categories
2. **Audit Trail**: All transactional tables have `created_by` and `last_changed_by`
3. **Referential Integrity**: Foreign keys enforce data consistency
4. **No Soft Deletes**: Deletions are hard deletes with cascade rules

### 3.2 Core Tables

#### A. AUTHENTICATION & ACCESS CONTROL

**`app_users`** - Application Login Credentials
```sql
CREATE TABLE app_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- BCrypt hash
    employee_id VARCHAR(20) REFERENCES employees(emp_id) UNIQUE,  -- MUST BE UNIQUE
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**RULE**: One employee can have ONLY ONE user account. This is enforced by UNIQUE constraint on `employee_id`.

**`permissions`** - Granular Capability Catalog
```sql
CREATE TABLE permissions (
    permission_code VARCHAR(50) PRIMARY KEY,  -- e.g., 'MANAGE_ORDERS'
    description VARCHAR(100)
);
```

**`role_permissions`** - Designation-Permission Mapping
```sql
CREATE TABLE role_permissions (
    designation_id INTEGER REFERENCES designations(designation_id),
    permission_code VARCHAR(50) REFERENCES permissions(permission_code),
    PRIMARY KEY (designation_id, permission_code)
);
```

#### B. HR & ORGANIZATIONAL STRUCTURE

**`departments`** - Organizational Units
```sql
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL
);
```

**`designations`** - Job Roles/Titles
```sql
CREATE TABLE designations (
    designation_id SERIAL PRIMARY KEY,
    designation_name VARCHAR(100) UNIQUE NOT NULL,
    designation_level INTEGER  -- Hierarchy (1=Top)
);
```

**`employees`** - Central HR Registry
```sql
CREATE TABLE employees (
    emp_id VARCHAR(20) PRIMARY KEY,  -- e.g., 'EMP-001'
    qr_id VARCHAR(50) UNIQUE,        -- RFID/QR Code
    token_no VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    designation_id INTEGER REFERENCES designations(designation_id),
    department_id INTEGER REFERENCES departments(department_id),
    block_id INTEGER REFERENCES blocks(block_id),
    shift_no INTEGER REFERENCES shifts(shift_no),
    working_line_no INTEGER REFERENCES lines(line_no),
    date_of_join DATE,
    address TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE'  -- ACTIVE, INACTIVE
);
```

**INDEXES**:
- `idx_emp_line` on `working_line_no`
- `idx_emp_dept` on `department_id`
- `idx_emp_status` on `status`
- `idx_emp_qr` on `qr_id`

#### C. ORDER MANAGEMENT

**`orders`** - Master Order Table (Buyer PO)
```sql
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,  -- Manual assignment, NOT auto-increment
    buyer VARCHAR(100),
    brand VARCHAR(100),
    season VARCHAR(50),
    oc VARCHAR(50),               -- Order Confirmation Number
    style_id VARCHAR(50),
    po VARCHAR(50),               -- Purchase Order Number
    country VARCHAR(50),          -- Destination
    colour_code INTEGER,
    age_group INTEGER,
    category INTEGER,
    size_category INTEGER REFERENCES size_categorys(size_category_id),
    order_quantity INTEGER        -- Total quantity across all sizes
);
```

**`size_categorys`** - Size Category Master
```sql
CREATE TABLE size_categorys (
    size_category_id SERIAL PRIMARY KEY,
    size_category_name VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'cat1', 'cat2'
    sizes TEXT[]  -- PostgreSQL array: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
);
```

**DYNAMIC TABLES**: `order_qty_{size_category_name}`

**Example**: `order_qty_cat1`
```sql
CREATE TABLE order_qty_cat1 (
    order_id INTEGER PRIMARY KEY REFERENCES orders(order_id) ON DELETE CASCADE,
    xxs INTEGER DEFAULT 0,
    xs INTEGER DEFAULT 0,
    s INTEGER DEFAULT 0,
    m INTEGER DEFAULT 0,
    l INTEGER DEFAULT 0,
    xl INTEGER DEFAULT 0,
    xxl INTEGER DEFAULT 0
);
```

**CRITICAL RULES**:
1. Table name format: `order_qty_{lowercase(size_category_name)}`
2. Column names: Lowercase, trimmed size names from `sizes` array
3. All size columns are `INTEGER DEFAULT 0`
4. Auto-created when size category is created
5. Cascading delete when order is deleted

#### D. PRODUCTION ENGINEERING (IE)

**`lines`** - Production Lines
```sql
CREATE TABLE lines (
    line_no SERIAL PRIMARY KEY,
    line_name VARCHAR(50) UNIQUE NOT NULL,
    block_id INTEGER REFERENCES blocks(block_id),
    running_style_id VARCHAR(50) REFERENCES style_master(style_id),
    line_supervisor_id VARCHAR(20) REFERENCES employees(emp_id),
    line_ie_id VARCHAR(20) REFERENCES employees(emp_id)
);
```

**`style_master`** - Garment Style Catalog
```sql
CREATE TABLE style_master (
    style_id VARCHAR(50) PRIMARY KEY,
    style_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`operation_master`** - Global Operation Library
```sql
CREATE TABLE operation_master (
    operation_id SERIAL PRIMARY KEY,
    operation_name VARCHAR(100) NOT NULL,
    sequence_no INTEGER NOT NULL,  -- Default order (1, 2, 3...)
    standard_allowed_minutes DECIMAL(5,2) DEFAULT 0.00  -- Base SAM
);
```

**DYNAMIC TABLES**: `size_{size_category_name}_op_sam_seam`

**Example**: `size_cat1_op_sam_seam`
```sql
CREATE TABLE size_cat1_op_sam_seam (
    operation_id SERIAL PRIMARY KEY,
    style_id VARCHAR(50) REFERENCES style_master(style_id),
    operation_name VARCHAR(150) NOT NULL,
    operation_sequence INTEGER NOT NULL,
    sam NUMERIC(5,3) NOT NULL,  -- Standard Allowed Minutes (high precision)
    machine_type VARCHAR(50),
    xxs INTEGER DEFAULT 0,      -- Unit count for XXS size
    xs INTEGER DEFAULT 0,
    s INTEGER DEFAULT 0,
    m INTEGER DEFAULT 0,
    l INTEGER DEFAULT 0,
    xl INTEGER DEFAULT 0,
    xxl INTEGER DEFAULT 0,
    created_by VARCHAR(20) REFERENCES employees(emp_id),
    last_changed_by VARCHAR(20) REFERENCES employees(emp_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**CRITICAL RULES**:
1. Table name format: `size_{lowercase(size_category_name)}_op_sam_seam`
2. Size columns represent **UNIT COUNTS** (INTEGER), NOT measurements
3. `sam` is DECIMAL(5,3) for precision (e.g., 1.245 minutes)
4. Audit fields (`created_by`, `last_changed_by`) are MANDATORY
5. `created_by` is IMMUTABLE after insertion
6. Auto-created when size category is created

#### E. CUTTING & PRODUCTION

**`cutting`** - Fabric Cutting Records
```sql
CREATE TABLE cutting (
    cutting_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,  -- Logical link to orders
    lay_no INTEGER NOT NULL,
    style_id VARCHAR(50) REFERENCES style_master(style_id),
    colour_code VARCHAR(20) NOT NULL,
    size VARCHAR(10) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    no_of_parts INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uniq_cutting_lay UNIQUE (style_id, lay_no, colour_code, size)
);
```

**RULE**: Each combination of (style, lay, color, size) can only exist ONCE. This prevents duplicate cutting entries for the same lay.

**`bundling`** - Bundle Generation from Cutting
```sql
CREATE TABLE bundling (
    bundle_id SERIAL PRIMARY KEY,  -- This is the RFID tag ID
    cutting_id INTEGER REFERENCES cutting(cutting_id),
    style_id VARCHAR(50) REFERENCES style_master(style_id),
    colour_code VARCHAR(20) NOT NULL,
    size VARCHAR(10) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    starting_no INTEGER NOT NULL,
    ending_no INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_bundle_qty CHECK ((ending_no - starting_no) + 1 = qty)
);
```

**RULE**: Bundle integrity is enforced: `(ending_no - starting_no) + 1 MUST EQUAL qty`

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Authentication Flow

```
1. User submits credentials (username, password)
   ↓
2. Backend validates against app_users table
   ↓
3. BCrypt compares password_hash
   ↓
4. If valid, fetch employee details + permissions
   ↓
5. Generate JWT with payload:
   {
     userId: 1,
     username: "john_doe",
     role: "IE Manager",
     employeeId: "EMP-001",
     permissions: ["VIEW_ORDERS", "MANAGE_LINES", ...]
   }
   ↓
6. Return token to client
   ↓
7. Client stores token in localStorage
   ↓
8. All subsequent requests include: Authorization: Bearer <token>
```

### 4.2 JWT Payload Structure

```javascript
{
  userId: INTEGER,              // app_users.user_id
  username: STRING,             // app_users.username
  role: STRING,                 // designations.designation_name
  employeeId: STRING,           // employees.emp_id
  permissions: ARRAY<STRING>    // From role_permissions join
}
```

**CRITICAL**: The JWT is signed with `process.env.JWT_SECRET` and expires in 8 hours.

### 4.3 Permission System

**Available Permissions** (from `permissions` table):
- `VIEW_DASHBOARD` - Access to main dashboard
- `MANAGE_ORDERS` - Create/Edit buyer orders (IT Manager)
- `VIEW_ORDERS` - Read-only access to orders (IE Manager)
- `VIEW_HR_DATA` - View sensitive employee data
- `MANAGE_EMPLOYEES` - Add/Edit employee records
- `MANAGE_LINES` - Full CRUD on production lines
- `VIEW_PRODUCTION_EMPLOYEES` - View production staff (filtered)
- `MANAGE_OPERATIONS` - Manage operation master data
- `MANAGE_CUTTING` - Add/Update cutting entries
- `MANAGE_MACHINES` - Machine asset management
- `VIEW_REPORTS` - Download production reports
- `SYSTEM_ADMIN` - Full system access (bypasses all checks)

### 4.4 Authorization Middleware

**authMiddleware.js** - JWT Verification
```javascript
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Attach user to request
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
```

**rbacMiddleware.js** - Permission Checking
```javascript
const requirePermission = (permissionCode) => {
    return (req, res, next) => {
        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permissionCode) && 
            !userPermissions.includes('SYSTEM_ADMIN')) {
            return res.status(403).json({ 
                message: `Requires permission: ${permissionCode}` 
            });
        }
        next();
    };
};
```

**Usage in Routes**:
```javascript
router.post('/orders', 
    authMiddleware,                      // Verify JWT
    requirePermission('MANAGE_ORDERS'),  // Check permission
    orderController.createOrder          // Execute
);
```

---

## 5. ROLE-WISE DASHBOARD RESPONSIBILITIES

### 5.1 IT Manager (Order Management)

**Designation**: IT Manager  
**Permissions**: `MANAGE_ORDERS`, `VIEW_DASHBOARD`

**Responsibilities**:
- Create new buyer orders
- Edit existing orders (all fields)
- Delete orders (with cascade to order_qty tables)
- Manage size categories (creates dynamic tables)
- View all orders without restriction

**Dashboard Access**:
- `/dashboard/it/orders` - Full CRUD interface

**Backend Enforcement**:
```javascript
// itService.js
async createOrder(orderData, user) {
    // No filtering - IT Manager sees all
    // Can create orders for any line/style
    return OrderRepo.create(orderData);
}
```

### 5.2 IE Manager (Industrial Engineering)

**Designation**: IE Manager  
**Permissions**: `VIEW_ORDERS`, `MANAGE_LINES`, `VIEW_PRODUCTION_EMPLOYEES`, `MANAGE_OPERATIONS`

**Responsibilities**:
- **Read-only** access to orders (cannot create/edit/delete)
- Full CRUD on production lines
- Assign running styles to lines
- Manage operation master data (style-specific operations)
- View production employees (filtered to Production department only)

**Dashboard Access**:
- `/dashboard/ie/orders` - Read-only order list
- `/dashboard/ie/lines` - Line management with running style assignment
- `/dashboard/ie/employees` - Production staff only
- `/dashboard/ie/operations` - Operation master CRUD

**Backend Enforcement**:
```javascript
// ieService.js
async getOrders(user) {
    // IE Manager sees all orders but CANNOT modify
    return OrderRepo.findAll();
}

async getEmployees(user) {
    // Filter to Production department only
    return EmployeeRepo.findByDepartment('Production');
}

async deleteOperation(operationId, user) {
    const operation = await OperationRepo.findById(operationId);
    
    // Can delete if:
    // 1. User created it (created_by = user.employeeId)
    // 2. User is IE Manager (role check)
    if (operation.created_by !== user.employeeId && 
        user.role !== 'IE Manager') {
        throw new Error('Unauthorized');
    }
    
    return OperationRepo.delete(operationId);
}
```

### 5.3 Cutting Manager

**Designation**: Cutting Manager  
**Permissions**: `VIEW_ORDERS`, `MANAGE_CUTTING`

**Responsibilities**:
- View orders (read-only)
- Add cutting entries (lay-wise)
- View cutting progress vs order quantity
- Cannot exceed order quantity per size

**Dashboard Access**:
- `/dashboard/production/cutting` - Order selection
- `/dashboard/production/cutting/:orderId` - Cutting entry form

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
```

### 5.4 HR Manager

**Designation**: HR Manager  
**Permissions**: `VIEW_HR_DATA`, `MANAGE_EMPLOYEES`

**Responsibilities**:
- Full CRUD on employee records
- View sensitive data (salary, bank details)
- Manage departments and designations

**Dashboard Access**:
- `/dashboard/hr` - Employee management

---

## 6. ORDER LIFECYCLE

### 6.1 Order Creation Flow

```
IT Manager creates order
   ↓
1. Validate size_category exists
   ↓
2. Generate order_id (manual or auto-increment simulation)
   ↓
3. Insert into orders table
   ↓
4. Determine dynamic table name: order_qty_{size_category_name}
   ↓
5. Ensure table exists (auto-create if needed)
   ↓
6. Insert size-wise quantities into dynamic table
   ↓
7. Commit transaction
   ↓
8. Return order details
```

**Code Flow**:
```javascript
// itService.js
async createOrder(orderData, user) {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // 1. Create order
        const order = await OrderRepo.createOrder(client, orderData);
        
        // 2. Get size category details
        const sizeCategory = await MasterRepo.getSizeCategory(client, orderData.size_category);
        const tableName = `order_qty_${sizeCategory.size_category_name.toLowerCase()}`;
        
        // 3. Ensure dynamic table exists
        await OrderRepo.ensureOrderQtyTable(client, tableName, sizeCategory.sizes);
        
        // 4. Insert size quantities
        await OrderRepo.createDynamicOrderQty(client, tableName, order.order_id, orderData.quantities);
        
        await client.query('COMMIT');
        return order;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### 6.2 Order Update Flow

```
IT Manager updates order
   ↓
1. Validate order exists
   ↓
2. Check if size_category changed
   ↓
3. If changed:
   - Delete from old dynamic table
   - Insert into new dynamic table
   ↓
4. If not changed:
   - Update quantities in existing dynamic table
   ↓
5. Update orders table
   ↓
6. Commit transaction
```

### 6.3 Order Delete Flow

```
IT Manager deletes order
   ↓
1. Check for dependencies (cutting, bundling)
   ↓
2. If dependencies exist: BLOCK deletion (or cascade if configured)
   ↓
3. Delete from orders table
   ↓
4. CASCADE deletes from order_qty_* table (ON DELETE CASCADE)
   ↓
5. Commit transaction
```

**CRITICAL RULE**: Order deletion is HARD DELETE, not soft delete. Cascading is handled by foreign key constraints.

---

## 7. LINE & PRODUCTION FLOW

### 7.1 Line Management

**IE Manager Workflow**:
```
1. Create/Edit Line
   ↓
2. Assign Block (location)
   ↓
3. Assign Line Supervisor (employee)
   ↓
4. Assign Line IE (employee)
   ↓
5. Set Running Style (from style_master)
   ↓
6. Save
```

**Running Style Assignment**:
- A line can have ONE running style at a time
- Changing running style updates `lines.running_style_id`
- This determines which operation bulletin is used for that line

**Code**:
```javascript
// ieService.js
async updateLine(lineNo, lineData, user) {
    // Validate running_style_id exists in style_master
    if (lineData.running_style_id) {
        const style = await StyleRepo.findById(lineData.running_style_id);
        if (!style) throw new Error('Invalid style');
    }
    
    return LineRepo.update(lineNo, lineData);
}
```

### 7.2 Operation Bulletin Management

**IE Manager creates operation sequences for a specific style**:

```
1. Select Size Category (determines which table to use)
   ↓
2. Select Style
   ↓
3. Add operations with:
   - Operation name
   - Sequence number
   - SAM (Standard Allowed Minutes)
   - Machine type
   - Unit counts per size (XXS, XS, S, M, L, XL, XXL)
   ↓
4. Save to size_{category}_op_sam_seam table
```

**Example**:
```javascript
// ieService.js
async createOperation(sizeCategoryId, operationData, user) {
    const sizeCategory = await MasterRepo.getSizeCategory(sizeCategoryId);
    const tableName = `size_${sizeCategory.size_category_name.toLowerCase()}_op_sam_seam`;
    
    // Ensure table exists
    await MasterRepo.ensureOperationTable(tableName, sizeCategory.sizes);
    
    // Add audit fields
    operationData.created_by = user.employeeId;
    operationData.last_changed_by = user.employeeId;
    
    return OperationRepo.create(tableName, operationData);
}
```

---

## 8. CUTTING FLOW & PERCENTAGE CALCULATIONS

### 8.1 Cutting Entry Process

```
Cutting Manager selects order
   ↓
1. System fetches order details + size quantities
   ↓
2. System calculates existing cut quantities
   ↓
3. Display form with:
   - Order qty per size
   - Already cut qty per size
   - Remaining qty per size
   - Input fields for new cutting
   ↓
4. Manager enters:
   - Lay number
   - Quantities per size
   ↓
5. Backend validates:
   - Total cut ≤ Order qty (per size)
   ↓
6. Save to cutting table
   ↓
7. Return updated statistics
```

### 8.2 Percentage Calculation Logic

**Size-wise Percentage**:
```
percentage = (cutQty / orderQty) * 100
```

**Total Percentage**:
```
totalPercentage = (totalCutQty / totalOrderQty) * 100
```

**Code**:
```javascript
// cuttingRepo.js
async getAggregateStats(orderId, tableName, sizeList) {
    const orderQty = await this.getDynamicOrderQty(tableName, orderId);
    const cutQtyRows = await this.getExistingCuttingQty(orderId);
    
    const stats = {
        totalOrderQty: 0,
        totalCutQty: 0,
        sizes: []
    };
    
    sizeList.forEach(size => {
        const lowerSize = size.toLowerCase();
        const oQty = orderQty ? (parseInt(orderQty[lowerSize], 10) || 0) : 0;
        const cQty = cutQtyMap[lowerSize] || 0;
        
        stats.totalOrderQty += oQty;
        stats.totalCutQty += cQty;
        
        stats.sizes.push({
            size: size,
            orderQty: oQty,
            cutQty: cQty,
            percentage: oQty > 0 ? parseFloat(((cQty / oQty) * 100).toFixed(2)) : 0
        });
    });
    
    stats.totalPercentage = stats.totalOrderQty > 0
        ? parseFloat(((stats.totalCutQty / stats.totalOrderQty) * 100).toFixed(2))
        : 0;
    
    return stats;
}
```

---

## 9. UI DESIGN RULES & STANDARDS

### 9.1 Design System (High-Density Operational UI)

**Theme**: Enterprise Operational Dashboard  
**Philosophy**: Maximum information density, minimal whitespace

**Color Palette**:
```css
--background: #f1f3f6;        /* Light grey background */
--foreground: #1a1c23;        /* Deep charcoal text */
--card: #ffffff;              /* White cards */
--card-foreground: #1a1c23;   /* Dark text on cards */
--muted: #f4f5f7;             /* Muted backgrounds */
--muted-foreground: #64748b;  /* Grey text */
--border: #e2e8f0;            /* Light borders */
--primary: #2563eb;           /* Blue accent */
--primary-foreground: #ffffff;/* White on blue */
--radius: 4px;                /* Strict compact radius */
```

**Spacing System**:
```css
--spacing-xs: 4px;
--spacing-sm: 8px;   /* PRIMARY SPACING UNIT */
--spacing-md: 12px;
```

**Typography**:
```css
body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 13px;  /* Base font for density */
}

h1, h2, h3 {
    font-weight: 700;
    color: #0f172a;
}
```

### 9.2 Component Standards

**`.op-card`** - Operational Card
```css
.op-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--spacing-sm);  /* 8px */
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
```

**`.op-table`** - Operational Table
```css
.op-table {
    width: 100%;
    border-collapse: collapse;
}

.op-table th {
    background: var(--muted);
    font-size: 11px;
    text-transform: uppercase;
    color: var(--muted-foreground);
    padding: 6px 8px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

.op-table td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
}

.op-table tr:hover {
    background-color: #f8fafc;
}
```

**Metric Display**:
```css
.metric-value {
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
}

.metric-label {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--muted-foreground);
    font-weight: 600;
}
```

### 9.3 Layout Rules

**Dashboard Layout**:
- Fixed sidebar: 200px width (`w-52`)
- Compact header: 40px height (`h-10`)
- Main content padding: 12px (`p-3`)
- Grid gaps: 8px (`gap-2`)

**Card Layouts**:
- Padding: 8px maximum
- Border radius: 4px (strict)
- Borders: 1px solid
- No large shadows

**PROHIBITED**:
- White text on white backgrounds
- Large empty spaces
- Decorative gradients (except for data visualization)
- Rounded-full buttons (use rectangular with 4px radius)
- Font sizes > 14px for body text
- Padding > 12px for page containers

---

## 10. SECURITY RULES & NON-NEGOTIABLES

### 10.1 Authentication Security

**MUST**:
1. Store passwords as BCrypt hashes (salt rounds: 10)
2. JWT tokens expire in 8 hours
3. Validate JWT signature on EVERY protected route
4. Never expose JWT secret in client code
5. One employee = One user account (enforced by UNIQUE constraint)

**MUST NOT**:
1. Store passwords in plain text
2. Accept tokens without verification
3. Trust client-side role/permission claims
4. Allow registration without valid employee_id

### 10.2 Authorization Security

**MUST**:
1. Check permissions on backend, not just frontend
2. Use `requirePermission()` middleware on ALL protected routes
3. Populate permissions from database, not hardcoded
4. Verify `SYSTEM_ADMIN` permission for bypass logic

**MUST NOT**:
1. Rely on frontend hiding UI elements for security
2. Skip permission checks for "trusted" users
3. Allow permission escalation through API manipulation

### 10.3 Data Integrity

**MUST**:
1. Use database transactions for multi-table operations
2. Validate foreign key references before insertion
3. Enforce unique constraints (order lay, bundle ranges)
4. Use parameterized queries (NEVER string concatenation)
5. Sanitize dynamic table names through whitelist validation

**MUST NOT**:
1. Accept user input directly in SQL table/column names
2. Skip validation on "internal" API calls
3. Allow partial commits (always use transactions)

### 10.4 Audit Trail

**MUST**:
1. Populate `created_by` from `req.user.employeeId` (server-side)
2. Update `last_changed_by` on every modification
3. Never allow client to set audit fields
4. Make `created_by` immutable after insertion

**MUST NOT**:
1. Accept audit fields from request body
2. Allow modification of `created_by`
3. Skip audit fields for "system" operations

---

## 11. TRANSACTION & DATA INTEGRITY RULES

### 11.1 Transaction Boundaries

**Use Transactions For**:
1. Order creation (orders + order_qty_*)
2. Order update with size category change
3. Order deletion (cascade handling)
4. Dynamic table creation
5. Bulk cutting entries

**Transaction Pattern**:
```javascript
const client = await db.getClient();
try {
    await client.query('BEGIN');
    
    // Multiple operations
    await operation1(client);
    await operation2(client);
    
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### 11.2 Validation Rules

**Order Validation**:
- `order_id` must be unique
- `size_category` must exist in `size_categorys`
- `style_id` must exist in `style_master` (if provided)
- Sum of size quantities should equal `order_quantity`

**Cutting Validation**:
- `order_id` must exist
- `style_id` must exist
- Combination (style, lay, color, size) must be unique
- Total cut qty ≤ Order qty (per size)
- `qty` must be > 0

**Operation Validation**:
- `style_id` must exist
- Size columns must be INTEGER ≥ 0
- `sam` must be > 0
- `operation_sequence` must be unique per style

### 11.3 Cascade Rules

**ON DELETE CASCADE**:
- `orders` → `order_qty_*` tables
- `cutting` → `bundling` (if configured)

**ON DELETE RESTRICT** (implicit):
- Cannot delete `style_master` if referenced in `lines.running_style_id`
- Cannot delete `employees` if referenced in `app_users.employee_id`

---

## 12. WHAT MUST NEVER BE CHANGED

### 12.1 Database Schema Invariants

**NEVER CHANGE**:
1. Dynamic table naming convention: `order_qty_{category}`, `size_{category}_op_sam_seam`
2. Size column data type: MUST be INTEGER
3. Audit field names: `created_by`, `last_changed_by`, `created_at`, `updated_at`
4. Primary key types (order_id, emp_id, etc.)
5. Foreign key cascade rules without careful analysis

**WHY**: These are foundational to the dynamic table generation logic and data integrity.

### 12.2 Authentication Flow

**NEVER CHANGE**:
1. JWT payload structure (userId, username, role, employeeId, permissions)
2. BCrypt salt rounds (10) - changing this breaks existing passwords
3. Token expiration (8 hours) without user notification
4. UNIQUE constraint on `app_users.employee_id`

**WHY**: Breaking these will invalidate all existing sessions and user accounts.

### 12.3 Permission System

**NEVER CHANGE**:
1. Permission codes in `permissions` table without updating all references
2. `SYSTEM_ADMIN` bypass logic
3. Permission checking order (auth → RBAC → controller)

**WHY**: This is the security backbone of the system.

### 12.4 Business Logic

**NEVER CHANGE**:
1. Cutting validation: Total cut ≤ Order qty
2. Bundle integrity: (ending_no - starting_no) + 1 = qty
3. One employee = One user account rule
4. Operation deletion: Only creator or IE Manager can delete

**WHY**: These are core business rules that ensure data accuracy.

---

## 13. FUTURE EXTENSION GUIDELINES

### 13.1 Adding a New Role

**Steps**:
1. Insert into `designations` table
2. Map permissions in `role_permissions`
3. Update frontend `menuConfig.js` if new routes needed
4. No code changes required (system auto-adapts)

### 13.2 Adding a New Permission

**Steps**:
1. Insert into `permissions` table
2. Map to roles in `role_permissions`
3. Add `requirePermission()` middleware to new routes
4. Update `menuConfig.js` for frontend visibility

### 13.3 Adding a New Size Category

**Steps**:
1. Insert into `size_categorys` with sizes array
2. System auto-creates:
   - `order_qty_{category}` table
   - `size_{category}_op_sam_seam` table
3. No manual table creation needed

### 13.4 Adding a New Module

**Steps**:
1. Create feature folder: `/client/src/features/{module}`
2. Create API service: `{module}Service.js`
3. Create backend: controller, service, repository
4. Define routes with appropriate middleware
5. Add menu items to `menuConfig.js`
6. Map permissions

---

## 14. TROUBLESHOOTING GUIDE

### 14.1 Common Issues

**Issue**: "Invalid token" error
**Cause**: JWT expired or secret mismatch
**Solution**: Re-login to get new token

**Issue**: "Access Denied. Requires permission: X"
**Cause**: User lacks required permission
**Solution**: Check `role_permissions` mapping for user's designation

**Issue**: "Cannot cut X for size Y. Order qty: Z"
**Cause**: Attempting to cut more than ordered
**Solution**: Verify order quantities in `order_qty_*` table

**Issue**: Dynamic table not found
**Cause**: Size category created but table not auto-generated
**Solution**: Check `ensureOrderQtyTable()` logic in `orderRepo.js`

**Issue**: "Employee ID already registered"
**Cause**: Attempting to create second user for same employee
**Solution**: One employee can only have one user account (by design)

### 14.2 Database Debugging

**Check order quantities**:
```sql
SELECT * FROM order_qty_cat1 WHERE order_id = 1001;
```

**Check cutting progress**:
```sql
SELECT size, SUM(qty) as total_cut
FROM cutting
WHERE order_id = '1001'
GROUP BY size;
```

**Check user permissions**:
```sql
SELECT u.username, d.designation_name, array_agg(rp.permission_code) as permissions
FROM app_users u
JOIN employees e ON u.employee_id = e.emp_id
JOIN designations d ON e.designation_id = d.designation_id
JOIN role_permissions rp ON d.designation_id = rp.designation_id
WHERE u.username = 'john_doe'
GROUP BY u.username, d.designation_name;
```

---

## 15. DEPLOYMENT CHECKLIST

### 15.1 Environment Variables

**Required**:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=GARMENTS
DB_USER=thrilok
DB_PASSWORD=5512

# JWT
JWT_SECRET=<strong-random-secret>

# Server
PORT=5000
NODE_ENV=production
```

### 15.2 Database Setup

1. Create database: `CREATE DATABASE GARMENTS;`
2. Run schema files in order:
   - `erp_schema_refinement.sql`
   - `erp_hr_machines.sql`
   - `auth_schema.sql`
   - `seed_data.sql`
3. Verify tables exist
4. Create initial admin user

### 15.3 Application Startup

**Backend**:
```bash
cd server
npm install
npm run dev  # Development
npm start    # Production
```

**Frontend**:
```bash
cd client
npm install
npm run dev  # Development
npm run build && npm run preview  # Production
```

---

## 16. GLOSSARY

**SAM** - Standard Allowed Minutes: Time allocated for an operation  
**DHU** - Defects per Hundred Units: Quality metric  
**PO** - Purchase Order: Buyer's order reference  
**OC** - Order Confirmation: Internal order confirmation number  
**Lay** - A stack of fabric layers for cutting  
**Bundle** - A group of cut pieces tagged with RFID  
**Running Style** - The garment style currently in production on a line  
**Size Category** - A group of sizes (e.g., XXS-XXL, 1X-5X)  
**Operation Bulletin** - List of operations for a specific style  
**RBAC** - Role-Based Access Control  
**PBAC** - Permission-Based Access Control  

---

## DOCUMENT CONTROL

**Maintained By**: Principal Software Architect  
**Review Cycle**: Quarterly or on major system changes  
**Change Log**: All modifications must be documented here

**Version History**:
- v1.0 (2026-01-20): Initial comprehensive documentation

---

**END OF MASTER DOCUMENTATION**

This document is the SINGLE SOURCE OF TRUTH for the Garments ERP system. Any deviation from these specifications must be approved and documented.
