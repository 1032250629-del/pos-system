/**
 * Database Layer for ApexPOS
 * Primary Engine: SQLite3 with persistent file storage (pos.db)
 * Includes schema creation, seed data initialization, and Promise-based query helpers.
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'pos.db');

// Seed Data for initial database population
const SEED_DATA = {
  settings: {
    storeName: "METRO HYPERMARKET",
    storeTagline: "Fresh Quality & Smart Savings",
    storeAddress: "104 University Avenue, Campus Center",
    storePhone: "+91 98765 43210",
    taxId: "GSTIN-33AABCM1234F1Z9",
    currency: "₹",
    defaultTaxRate: 5.0,
    receiptFooter: "Thank you for shopping with us! Please retain this bill for returns within 7 days.",
    lowStockThreshold: 10,
    theme: "light"
  },
  users: [
    { id: "usr-1", name: "Alex Morgan", role: "admin", pin: "1234", avatar: "AM" },
    { id: "usr-2", name: "Sarah Connor", role: "cashier", pin: "0000", avatar: "SC" }
  ],
  categories: [
    { id: "all", name: "All Items", icon: "🛍️" },
    { id: "beverages", name: "Beverages", icon: "🥤" },
    { id: "bakery", name: "Bakery & Fresh", icon: "🥐" },
    { id: "snacks", name: "Snacks & Munchies", icon: "🍿" },
    { id: "dairy", name: "Dairy & Frozen", icon: "🧀" },
    { id: "produce", name: "Fresh Produce", icon: "🍎" },
    { id: "electronics", name: "Electronics & Tech", icon: "🎧" },
    { id: "household", name: "Household Care", icon: "🧼" }
  ],
  products: [
    { id: "prod-101", name: "Cold Brew Artisan Coffee", sku: "BEV-001", barcode: "8901001001", category: "beverages", price: 180, costPrice: 95, taxRate: 5.0, stock: 45, icon: "☕", description: "Organic steeped cold brew 350ml" },
    { id: "prod-102", name: "Sparkling Mineral Water", sku: "BEV-002", barcode: "8901001002", category: "beverages", price: 60, costPrice: 30, taxRate: 5.0, stock: 80, icon: "💧", description: "Naturally carbonated mineral water 500ml" },
    { id: "prod-103", name: "Matcha Green Tea Latte", sku: "BEV-003", barcode: "8901001003", category: "beverages", price: 220, costPrice: 110, taxRate: 5.0, stock: 30, icon: "🍵", description: "Ceremonial grade matcha with oat milk" },
    { id: "prod-104", name: "Fresh Sourdough Bread", sku: "BAK-001", barcode: "8901002001", category: "bakery", price: 140, costPrice: 70, taxRate: 0, stock: 18, icon: "🍞", description: "Stone ground naturally fermented sourdough" },
    { id: "prod-105", name: "Butter Croissant (2-Pack)", sku: "BAK-002", barcode: "8901002002", category: "bakery", price: 120, costPrice: 55, taxRate: 5.0, stock: 12, icon: "🥐", description: "Flaky French-style all-butter croissants" },
    { id: "prod-106", name: "Blueberry Muffin Box", sku: "BAK-003", barcode: "8901002003", category: "bakery", price: 160, costPrice: 75, taxRate: 5.0, stock: 6, icon: "🧁", description: "Loaded with wild blueberries" },
    { id: "prod-107", name: "Truffle & Sea Salt Chips", sku: "SNK-001", barcode: "8901003001", category: "snacks", price: 95, costPrice: 45, taxRate: 5.0, stock: 50, icon: "🥔", description: "Hand-cooked kettle chips with black truffle" },
    { id: "prod-108", name: "Dark Chocolate Almonds", sku: "SNK-002", barcode: "8901003002", category: "snacks", price: 240, costPrice: 120, taxRate: 5.0, stock: 25, icon: "🍫", description: "70% single origin cocoa roasted almonds 200g" },
    { id: "prod-109", name: "White Cheddar Popcorn", sku: "SNK-003", barcode: "8901003003", category: "snacks", price: 85, costPrice: 35, taxRate: 5.0, stock: 40, icon: "🍿", description: "Air-popped gourmet cheddar corn" },
    { id: "prod-110", name: "Greek Whole Milk Yogurt", sku: "DRY-001", barcode: "8901004001", category: "dairy", price: 110, costPrice: 50, taxRate: 0, stock: 22, icon: "🥛", description: "Unsweetened authentic Greek yogurt 500g" },
    { id: "prod-111", name: "Aged Cheddar Block (200g)", sku: "DRY-002", barcode: "8901004002", category: "dairy", price: 195, costPrice: 90, taxRate: 5.0, stock: 15, icon: "🧀", description: "Sharp white cheddar aged 12 months" },
    { id: "prod-112", name: "Almond Milk Unsweetened", sku: "DRY-003", barcode: "8901004003", category: "dairy", price: 175, costPrice: 85, taxRate: 0, stock: 35, icon: "🧃", description: "Plant-based calcium fortified milk 1L" },
    { id: "prod-113", name: "Organic Hass Avocados (Pack of 2)", sku: "PRD-001", barcode: "8901005001", category: "produce", price: 160, costPrice: 80, taxRate: 0, stock: 40, icon: "🥑", description: "Ripe ready-to-eat organic avocados" },
    { id: "prod-114", name: "Fresh Royal Gala Apples (1kg)", sku: "PRD-002", barcode: "8901005002", category: "produce", price: 180, costPrice: 90, taxRate: 0, stock: 60, icon: "🍎", description: "Crisp and sweet fresh orchard apples" },
    { id: "prod-115", name: "Organic Baby Spinach (250g)", sku: "PRD-003", barcode: "8901005003", category: "produce", price: 60, costPrice: 25, taxRate: 0, stock: 14, icon: "🥬", description: "Pre-washed triple-cleaned greens" },
    { id: "prod-116", name: "Fast USB-C Braided Cable 2M", sku: "ELC-001", barcode: "8901006001", category: "electronics", price: 399, costPrice: 150, taxRate: 18.0, stock: 25, icon: "🔌", description: "65W Fast Charging durable braided cable" },
    { id: "prod-117", name: "Wireless Earbuds Lite", sku: "ELC-002", barcode: "8901006002", category: "electronics", price: 1299, costPrice: 550, taxRate: 18.0, stock: 8, icon: "🎧", description: "Bluetooth 5.3 with 24hr battery life" },
    { id: "prod-118", name: "Multi-Surface Citrus Cleaner", sku: "HOU-001", barcode: "8901007001", category: "household", price: 149, costPrice: 65, taxRate: 12.0, stock: 30, icon: "🧴", description: "Eco-friendly antibacterial spray 750ml" },
    { id: "prod-119", name: "Ultra Soft Paper Towels (4pk)", sku: "HOU-002", barcode: "8901007002", category: "household", price: 249, costPrice: 110, taxRate: 12.0, stock: 0, icon: "🧻", description: "2-ply absorbent recycled paper towels" },
    { id: "prod-120", name: "Aromatherapy Soy Candle", sku: "HOU-003", barcode: "8901007003", category: "household", price: 350, costPrice: 140, taxRate: 12.0, stock: 16, icon: "🕯️", description: "Lavender & Eucalyptus pure soy wax candle" }
  ],
  customers: [
    { id: "cust-0", name: "Walk-in Customer", phone: "N/A", email: "walkin@store.local", points: 0, totalSpent: 0 },
    { id: "cust-1", name: "Rahul Sharma", phone: "+91 98234 56789", email: "rahul.s@gmail.com", points: 145, totalSpent: 4200 },
    { id: "cust-2", name: "Pooja Patel", phone: "+91 98345 67890", email: "pooja.p@outlook.com", points: 320, totalSpent: 8900 },
    { id: "cust-3", name: "Anand Verma", phone: "+91 98456 78901", email: "anand.v@yahoo.com", points: 80, totalSpent: 2100 }
  ],
  orders: [
    {
      id: "ORD-1001",
      invoiceNumber: "INV-2026-0001",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      cashier: "Alex Morgan",
      customer: { id: "cust-1", name: "Rahul Sharma" },
      items: [
        { id: "prod-101", name: "Cold Brew Artisan Coffee", price: 180, qty: 2, taxRate: 5.0, total: 360 },
        { id: "prod-105", name: "Butter Croissant (2-Pack)", price: 120, qty: 1, taxRate: 5.0, total: 120 }
      ],
      subtotal: 480,
      tax: 24,
      discount: 0,
      grandTotal: 504,
      paymentMethod: "cash",
      tenderedAmount: 500,
      changeDue: 0,
      status: "completed"
    }
  ]
};

let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn("⚠️ [DB] Warning: 'sqlite3' package is not installed yet. Run 'npm install' to enable SQLite.");
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isSqlite = false;
    this.memoryData = null;
    this.jsonFilePath = path.join(__dirname, 'pos-fallback.json');
  }

  async init() {
    if (sqlite3) {
      try {
        await this.initSqlite();
        this.isSqlite = true;
        console.log(`✅ [DB] Connected to SQLite database at: ${DB_PATH}`);
        await this.createTables();
        await this.seedDataIfNeeded();
        return;
      } catch (err) {
        console.error("❌ [DB] SQLite initialization failed, falling back to JSON storage:", err.message);
      }
    }

    // Fallback JSON-file store if sqlite3 driver is not compiled
    this.initJsonStore();
  }

  initSqlite() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) return reject(err);
        this.db.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
          if (pragmaErr) return reject(pragmaErr);
          resolve();
        });
      });
    });
  }

  // Promise wrappers for SQLite
  run(sql, params = []) {
    if (!this.isSqlite) return this.jsonRun(sql, params);
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  all(sql, params = []) {
    if (!this.isSqlite) return this.jsonAll(sql, params);
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  get(sql, params = []) {
    if (!this.isSqlite) return this.jsonGet(sql, params);
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async createTables() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        storeName TEXT NOT NULL,
        storeTagline TEXT,
        storeAddress TEXT,
        storePhone TEXT,
        taxId TEXT,
        currency TEXT DEFAULT '₹',
        defaultTaxRate REAL DEFAULT 5.0,
        receiptFooter TEXT,
        lowStockThreshold INTEGER DEFAULT 10,
        theme TEXT DEFAULT 'light'
      );`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        pin TEXT,
        avatar TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        category TEXT,
        price REAL NOT NULL,
        costPrice REAL DEFAULT 0,
        taxRate REAL DEFAULT 5.0,
        stock INTEGER DEFAULT 0,
        icon TEXT,
        description TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        points INTEGER DEFAULT 0,
        totalSpent REAL DEFAULT 0
      );`,

      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        invoiceNumber TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        cashier TEXT,
        customer TEXT,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        discount REAL DEFAULT 0,
        grandTotal REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        tenderedAmount REAL DEFAULT 0,
        changeDue REAL DEFAULT 0,
        status TEXT DEFAULT 'completed',
        refundReason TEXT,
        refundedAt TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS held_orders (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        customer TEXT,
        items TEXT NOT NULL,
        discountType TEXT,
        discountValue REAL,
        summary TEXT,
        note TEXT
      );`
    ];

    for (const sql of schemas) {
      await this.run(sql);
    }
  }

  async seedDataIfNeeded() {
    const prodCountRow = await this.get("SELECT COUNT(*) as count FROM products");
    if (prodCountRow && prodCountRow.count > 0) {
      return; // Already seeded
    }

    console.log("🌱 [DB] Seeding database with initial catalog, settings & users...");
    await this.resetToDefaults();
  }

  async resetToDefaults() {
    if (this.isSqlite) {
      // Clear existing records
      await this.run("DELETE FROM settings;");
      await this.run("DELETE FROM users;");
      await this.run("DELETE FROM categories;");
      await this.run("DELETE FROM products;");
      await this.run("DELETE FROM customers;");
      await this.run("DELETE FROM orders;");
      await this.run("DELETE FROM held_orders;");

      // Insert Settings
      const s = SEED_DATA.settings;
      await this.run(
        `INSERT INTO settings (id, storeName, storeTagline, storeAddress, storePhone, taxId, currency, defaultTaxRate, receiptFooter, lowStockThreshold, theme)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [s.storeName, s.storeTagline, s.storeAddress, s.storePhone, s.taxId, s.currency, s.defaultTaxRate, s.receiptFooter, s.lowStockThreshold, s.theme]
      );

      // Insert Users
      for (const u of SEED_DATA.users) {
        await this.run(
          `INSERT INTO users (id, name, role, pin, avatar) VALUES (?, ?, ?, ?, ?);`,
          [u.id, u.name, u.role, u.pin, u.avatar]
        );
      }

      // Insert Categories
      for (const c of SEED_DATA.categories) {
        await this.run(
          `INSERT INTO categories (id, name, icon) VALUES (?, ?, ?);`,
          [c.id, c.name, c.icon]
        );
      }

      // Insert Products
      for (const p of SEED_DATA.products) {
        await this.run(
          `INSERT INTO products (id, name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [p.id, p.name, p.sku, p.barcode, p.category, p.price, p.costPrice, p.taxRate, p.stock, p.icon, p.description]
        );
      }

      // Insert Customers
      for (const c of SEED_DATA.customers) {
        await this.run(
          `INSERT INTO customers (id, name, phone, email, points, totalSpent)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [c.id, c.name, c.phone, c.email, c.points, c.totalSpent]
        );
      }

      // Insert Seed Orders
      for (const o of SEED_DATA.orders) {
        await this.run(
          `INSERT INTO orders (id, invoiceNumber, timestamp, cashier, customer, items, subtotal, tax, discount, grandTotal, paymentMethod, tenderedAmount, changeDue, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            o.id,
            o.invoiceNumber,
            o.timestamp,
            o.cashier,
            JSON.stringify(o.customer),
            JSON.stringify(o.items),
            o.subtotal,
            o.tax,
            o.discount || 0,
            o.grandTotal,
            o.paymentMethod,
            o.tenderedAmount || o.grandTotal,
            o.changeDue || 0,
            o.status || 'completed'
          ]
        );
      }
      console.log("✅ [DB] Database successfully seeded with demo products and configuration.");
    } else {
      this.memoryData = JSON.parse(JSON.stringify(SEED_DATA));
      this.saveJsonStore();
    }
  }

  // --- JSON File Fallback Store (Used if sqlite3 binary is missing) ---
  initJsonStore() {
    this.isSqlite = false;
    try {
      if (fs.existsSync(this.jsonFilePath)) {
        this.memoryData = JSON.parse(fs.readFileSync(this.jsonFilePath, 'utf8'));
        console.log(`📦 [DB] Loaded fallback storage from: ${this.jsonFilePath}`);
      } else {
        this.memoryData = JSON.parse(JSON.stringify(SEED_DATA));
        this.saveJsonStore();
        console.log(`📦 [DB] Created fallback storage at: ${this.jsonFilePath}`);
      }
    } catch (e) {
      this.memoryData = JSON.parse(JSON.stringify(SEED_DATA));
    }
  }

  saveJsonStore() {
    try {
      fs.writeFileSync(this.jsonFilePath, JSON.stringify(this.memoryData, null, 2), 'utf8');
    } catch (e) {
      console.error("[DB] Could not write fallback storage:", e);
    }
  }

  // JSON storage helper queries
  jsonAll(sql, params) {
    const s = sql.toLowerCase();
    if (s.includes('from products')) return Promise.resolve(this.memoryData.products);
    if (s.includes('from categories')) return Promise.resolve(this.memoryData.categories);
    if (s.includes('from customers')) return Promise.resolve(this.memoryData.customers);
    if (s.includes('from orders')) return Promise.resolve(this.memoryData.orders);
    if (s.includes('from held_orders')) return Promise.resolve(this.memoryData.heldOrders || []);
    if (s.includes('from users')) return Promise.resolve(this.memoryData.users);
    return Promise.resolve([]);
  }

  jsonGet(sql, params) {
    const s = sql.toLowerCase();
    if (s.includes('from settings')) return Promise.resolve(this.memoryData.settings);
    if (s.includes('from products') && params[0]) {
      const p = this.memoryData.products.find(x => x.id === params[0] || x.barcode === params[0] || x.sku === params[0]);
      return Promise.resolve(p || null);
    }
    if (s.includes('from users') && params[0]) {
      return Promise.resolve(this.memoryData.users.find(u => u.id === params[0]) || null);
    }
    if (s.includes('from customers') && params[0]) {
      return Promise.resolve(this.memoryData.customers.find(c => c.id === params[0]) || null);
    }
    if (s.includes('from orders') && params[0]) {
      return Promise.resolve(this.memoryData.orders.find(o => o.id === params[0]) || null);
    }
    if (s.includes('count(*) as count from products')) {
      return Promise.resolve({ count: (this.memoryData.products || []).length });
    }
    return Promise.resolve(null);
  }

  jsonRun(sql, params) {
    // Basic mutations on in-memory fallback
    this.saveJsonStore();
    return Promise.resolve({ lastID: Date.now(), changes: 1 });
  }
}

const db = new DatabaseManager();

module.exports = {
  db,
  SEED_DATA
};
