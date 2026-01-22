# Production Full-Stack Architecture Guide

## 1. Architecture Overview

This project follows a **Layered Monolith** (or Modular Monolith) architecture, designed to be easily split into microservices if needed in the future.

### **System Flow**
1.  **Client (React)**: User interacts with the UI. State is managed locally or via Context/Redux.
2.  **API Gateway / Load Balancer** (Nginx/Cloud): Route requests to Node.js instances.
3.  **API Layer (Express Controllers)**: Handles HTTP requests, validation, and response formatting.
4.  **Service Layer (Business Logic)**: Contains the core business rules. Pure JS/TS, framework agnostic.
5.  **Repository Layer (Data Access)**: Handles raw SQL/ORM queries. Decouples DB implementation from logic.
6.  **Database (PostgreSQL)**: Persistent storage with TimescaleDB extension.

---

## 2. Frontend Architecture (React)

We use a **Feature-Based Folder Structure**. Instead of grouping by file type (controllers, views), we group by business feature (Auth, Orders, Production).

### **Folder Structure**

```text
/client
├── /public            # Static assets
├── /src
│   ├── /assets        # Global images, fonts, styles
│   ├── /components    # Shared UI library (Button, Modal, Input) - "Dumb" components
│   ├── /config        # Envs, Constants (API URLs)
│   ├── /context       # Global state (Theme, User Auth)
│   ├── /hooks         # Shared custom hooks (useFetch, useDebounce)
│   ├── /layouts       # Page layouts (DashboardLayout, AuthLayout)
│   ├── /lib           # 3rd party lib configurations (Axios instance, utils)
│   ├── /features      # CORE BUSINESS LOGIC MODULES
│   │   ├── /auth      # Feature: Authentication
│   │   │   ├── /api         # Auth specific API calls
│   │   │   ├── /components  # LoginForm, RegisterForm
│   │   │   ├── /hooks       # useAuth
│   │   │   └── index.ts     # Public API of the feature
│   │   ├── /orders    # Feature: Order Management
│   │   └── /tracking  # Feature: Bundle Tracking
│   ├── /pages         # Page composition (routes point here)
│   ├── /routes        # Route definitions (Public, Private, Role-based)
│   └── App.tsx        # Root component provider setup
```

### **Key Responsibilities**
*   **features/**: Everything related to a domain. `features/orders/api/getOrder.ts` is better than `src/api/orders.ts`.
*   **components/**: Generic UI. A `<Button>` here doesn't know what an "Order" is.
*   **pages/**: Logic-less containers. They import Feature Components and arrange them.

### **Sample Code: API Service (`features/orders/api/orders.service.js`)**
```javascript
import apiClient from '@/lib/apiClient';

export const fetchOrders = async (filters) => {
  const params = new URLSearchParams(filters).toString();
  const response = await apiClient.get(`/orders?${params}`);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};
```

---

## 3. Backend Architecture (Node.js)

We enforce a strict **Separation of Concerns**. The Controller *never* talks to the DB directly.

### **Folder Structure**

```text
/server
├── /src
│   ├── /api           # Interface Layer
│   │   ├── /controllers  # Request/Response handlers ONLY
│   │   ├── /middlewares  # Auth, Validation, Error Handling
│   │   ├── /routes       # Express Route definitions
│   │   └── /validators   # Joi/Zod schemas
│   ├── /config        # Environment variables, DB connection setup
│   ├── /loaders       # Startup scripts (Express, Logger, DB init)
│   ├── /services      # BUSINESS LOGIC LAYER (The brain)
│   ├── /repositories  # DATA ACCESS LAYER (SQL queries)
│   ├── /types         # TypeScript specific types (or JSDoc definitions)
│   ├── /utils         # Global helpers (Logger, ErrorClasses)
│   └── app.js         # Entry point
├── .env               # Secrets (never committed)
└── package.json
```

### **Responsibilities**
1.  **Controller**: "I received a request. Is it valid format? Okay, hey Service, do this work. Here is the result."
2.  **Service**: "I need to create an order. First, check if stock exists. Then calculate tax. Then tell Repository to save."
3.  **Repository**: "I execute `INSERT INTO orders...`".

### **Sample Code: Backend Flow**

**1. Controller (`src/api/controllers/orderController.js`)**
```javascript
const OrderService = require('../../services/orderService');
const { AppError } = require('../../utils/errorHandler');

const createOrder = async (req, res, next) => {
  try {
    // 1. Validation (Input layer)
    // (Assume middleware already validated req.body via Joi)

    // 2. Delegate to Service (Business layer)
    const order = await OrderService.createOrder(req.user.id, req.body);

    // 3. Response (Interface layer)
    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err); // Centralized error handling
  }
};
module.exports = { createOrder };
```

**2. Service (`src/services/orderService.js`)**
```javascript
const OrderRepo = require('../repositories/orderRepo');
const UserRepo = require('../repositories/userRepo');

const createOrder = async (userId, orderData) => {
  // Business Logic: Check if user is active
  const user = await UserRepo.findById(userId);
  if (!user.isActive) {
    throw new Error('User is not active');
  }

  // Business Logic: Calculate total value
  const totalValue = orderData.items.reduce((acc, item) => acc + item.price, 0);
  const enrichedData = { ...orderData, totalValue, createdBy: userId };

  // Data Persistence
  return await OrderRepo.save(enrichedData);
};
module.exports = { createOrder };
```

**3. Repository (`src/repositories/orderRepo.js`)**
```javascript
const db = require('../config/database'); // Postgres Pool

const save = async (orderData) => {
  // Raw SQL / Query Builder logic lives HERE only
  const query = `
    INSERT INTO orders (user_id, total_value, status)
    VALUES ($1, $2, 'PENDING')
    RETURNING *;
  `;
  const values = [orderData.createdBy, orderData.totalValue];
  const { rows } = await db.query(query, values);
  return rows[0];
};
module.exports = { save };
```

---

## 4. Scalability & Maintenance

### **How this supports scaling:**
*   **Stateless Backend**: The Node.js layer holds no local state (sessions are in DB/Redis). This means we can spin up 10 instances of the server behind a Load Balancer (Nginx/AWS ALB) to handle millions of requests.
*   **Caching**: We can inject a Caching Layer (Redis) into the **Repository** or **Service** layer transparently.
    *   *Example*: `OrderRepo.getById` checks Redis first, then SQL.
*   **Read/Write Splitting**: Repository can be configured to send `SELECT` to Read-Replicas and `INSERT/UPDATE` to the Primary DB.

### **How this supports maintenance:**
*   **Testability**: Since *Services* are pure JS logic, we can Unit Test them easily by mocking the Repository. We don't need a real DB to test business rules.
*   **Refactoring**: If we switch from PostgreSQL to MongoDB, we **only rewrite the Repository layer**. The Controllers and Services remain untouched.

## 5. DevOps Readiness
*   **Docker**: Create a `Dockerfile` for Client (Build stage -> Nginx serve) and Server (Node runtime).
*   **CI/CD**: Run linting and unit tests on every PR.
*   **Environment Variables**: Strict separation.
    *   `DB_HOST`
    *   `JWT_SECRET`
    *   `Redis_URL`
