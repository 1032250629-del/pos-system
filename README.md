# ApexPOS — Backend Server & REST API Integration

A high-performance, robust Point of Sale (POS) and inventory backend built with **Node.js**, **Express**, and **SQLite3** (`pos.db`), with real-time REST API integration for the frontend terminal.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure **Node.js** (v18 or higher) and **npm** are installed on your machine.
Verify with:
```bash
node -v
npm -v
```
*(If Node.js is not yet installed on Windows, download the LTS installer from [nodejs.org](https://nodejs.org) or install via `winget install OpenJS.NodeJS.LTS`)*

---

### 2. Installation & Server Startup

Navigate to the project directory in your terminal (PowerShell or Command Prompt):

```bash
# Navigate to the project directory
cd "C:\Users\swati\.gemini\antigravity\scratch\pos-system"

# Install dependencies (Express, CORS, SQLite3)
npm install

# Start the ApexPOS server
npm start
```

For automatic hot-reloading during development:
```bash
npm run dev
```

---

### 3. Open Application
Once the server starts, open your browser and navigate to:
```
http://localhost:3000
```
- **Backend API Base**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api/health`
- **Default Database**: `pos.db` (auto-created and seeded on first run)

---

## 📂 Project Architecture

```
pos-system/
├── index.html               # Main Single-Page POS application
├── server.js                # Express Server, Middleware, and REST API Routes
├── db.js                    # SQLite3 Database Manager, Migrations & Seed Data
├── package.json             # NPM project manifest & scripts
├── css/                     # Application Stylesheets
│   ├── dashboard.css        # Charts, metrics & analytics styling
│   ├── inventory.css        # Products catalog table & stock adjusters
│   ├── main.css             # Layout, sidebar, top header, status badge
│   ├── pos.css              # 2-column billing terminal, cart, payment modal
│   ├── receipt.css          # Thermal receipt preview & print layout
│   └── variables.css        # Modern typography, colors & CSS design tokens
└── js/                      # Frontend JavaScript Modules
    ├── app.js               # Shell router, keyboard shortcuts & audio effects
    ├── auth.js              # User roles, PIN validation & session manager
    ├── cart.js              # Reactive shopping cart & tax/discount engine
    ├── customers.js         # Customer CRM table & loyalty points manager
    ├── dashboard.js         # Chart.js analytics & KPI metric renderer
    ├── data.js              # Seed data constants & demo catalog
    ├── inventory.js         # Products catalog CRUD & stock replenishment
    ├── pos.js               # Barcode lookup, catalog grid, modal checkout
    ├── settings.js          # Store identity, currency, GST tax rates
    ├── storage.js           # REST API client with offline cache & sync
    └── transactions.js      # Sales history, refunds & receipt reprinting
```

---

## 📡 REST API Reference

### 🔐 1. Authentication & Operators
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/users` | List all available cashier/admin operators |
| `POST` | `/api/auth/login` | Authenticate with `{ userId, pin }` |
| `GET` | `/api/auth/current` | Retrieve currently active operator session |
| `POST` | `/api/auth/switch` | Switch active operator `{ userId }` |
| `POST` | `/api/auth/logout` | End current session |

### 📦 2. Inventory & Products
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Get products (filters: `category`, `search`, `stockFilter`) |
| `GET` | `/api/products/:id` | Get single product by ID |
| `GET` | `/api/products/lookup/:code` | Barcode / SKU quick lookup (for hardware barcode scanners) |
| `POST` | `/api/products` | Create a new product |
| `PUT` | `/api/products/:id` | Update product details |
| `PATCH` | `/api/products/:id/stock` | Adjust stock delta `{ qtyDelta: 1 }` or set `{ stock: 50 }` |
| `DELETE` | `/api/products/:id` | Remove product from inventory |
| `GET` | `/api/categories` | List all product categories |
| `POST` | `/api/categories` | Add/update category |

### 👥 3. Customers & Loyalty CRM
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers` | List customers (supports `?search=` by name/phone/email) |
| `GET` | `/api/customers/:id` | Get customer by ID |
| `POST` | `/api/customers` | Add a new customer |
| `PUT` | `/api/customers/:id` | Update customer contact info & points |
| `PATCH` | `/api/customers/:id/points` | Add or redeem loyalty reward points |

### 💳 4. Transactions, POS Checkout & Orders
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/orders` | **Process Sale / Checkout**: Atomically decrements stock, updates customer loyalty points, generates sequential invoice number (`INV-2026-XXXX`), and returns order + receipt data |
| `GET` | `/api/orders` | List sales orders (filters: `status`, `paymentMethod`, `search`) |
| `GET` | `/api/orders/:id` | Get order details |
| `POST` | `/api/orders/:id/refund` | Refund order: restocks product quantities back to inventory and marks order refunded |
| `GET` | `/api/held-orders` | Retrieve parked bills |
| `POST` | `/api/held-orders` | Park/hold current active bill |
| `DELETE` | `/api/held-orders/:id` | Discard or resume parked bill |

### 📊 5. Analytics & Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Returns today's revenue, order count, AOV, low stock alerts, 7-day trend array, category distribution, top 5 products, and recent orders |

### ⚙️ 6. Store Settings & Storage
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Get store identity, currency, GST tax rate, low stock threshold |
| `PUT` | `/api/settings` | Update store configuration |
| `POST` | `/api/settings/reset` | Restore database back to factory demo seed catalog |

---

## 🗄️ Database Details (SQLite & MongoDB)

### Default Engine: SQLite3 (`pos.db`)
- Zero external configuration: runs out of the box with zero external daemons.
- Persistent file storage located at `pos.db`.
- Automatic table creation and initial seeding from `SEED_DATA`.
- Atomic transactions prevent race conditions during concurrent POS sales.

### Switching to MongoDB (Optional)
If you wish to switch from SQLite to MongoDB Atlas or local MongoDB:
1. Install Mongoose: `npm install mongoose`
2. Connect to Mongo:
   ```javascript
   const mongoose = require('mongoose');
   mongoose.connect('mongodb://localhost:27017/apexpos');
   ```
3. Map the Mongoose schemas (`Product`, `Customer`, `Order`, `Setting`, `User`) to the same Express REST routes in `server.js`. The frontend (`storage.js`) requires zero changes because it communicates via standard REST JSON APIs.
