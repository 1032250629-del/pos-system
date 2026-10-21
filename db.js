/**
 * ApexPOS Database Module
 * Uses sqlite3 native driver with fallback mechanism
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'pos.db');
const FALLBACK_FILE = path.join(__dirname, 'pos-fallback.json');

let sqlite3;
let sqliteDb = null;
let isSqlite = false;

try {
  sqlite3 = require('sqlite3').verbose();
  sqliteDb = new sqlite3.Database(DB_FILE);
  isSqlite = true;
  console.log(`[DB] Connected to SQLite database at ${DB_FILE}`);
} catch (err) {
  console.warn(`[DB] Warning: SQLite initialization failed (${err.message}). Using JSON storage fallback.`);
  isSqlite = false;
}

const SEED_DATA = {
  settings: {
    id: 1,
    storeName: "Apex Retail Store",
    storeTagline: "Next-Gen Point of Sale",
    storeAddress: "123 Business Hub, Tech Park",
    storePhone: "+1 (800) 555-0199",
    taxId: "TAX-998877",
    currency: "₹",
    defaultTaxRate: 5.0,
    lowStockThreshold: 10,
    receiptFooter: "Thank you for shopping with ApexPOS!",
    theme: "light"
  },
  users: [
    { id: "usr-1", name: "Alex Morgan", role: "admin", pin: "1234", avatar: "AM" },
    { id: "usr-2", name: "Sarah Connor", role: "cashier", pin: "0000", avatar: "SC" }
  ],
  categories: [
    { id: "beverages", name: "Beverages", icon: "☕" },
    { id: "bakery", name: "Bakery & Fresh", icon: "🥐" },
    { id: "snacks", name: "Snacks & Munchies", icon: "🍿" },
    { id: "dairy", name: "Dairy & Frozen", icon: "🧀" }
  ],
  products: [
    { id: "BEV-001", name: "Cold Brew Artisan Coffee", sku: "SKU-1001", barcode: "8901001", category: "beverages", price: 180.0, costPrice: 90.0, taxRate: 5.0, stock: 45, icon: "☕", description: "Rich cold brewed coffee" },
    { id: "BEV-002", name: "Sparkling Mineral Water", sku: "SKU-1002", barcode: "8901002", category: "beverages", price: 60.0, costPrice: 25.0, taxRate: 5.0, stock: 80, icon: "💧", description: "Crisp sparkling water" },
    { id: "BAK-001", name: "Fresh Sourdough Bread", sku: "SKU-2001", barcode: "8902001", category: "bakery", price: 140.0, costPrice: 70.0, taxRate: 5.0, stock: 18, icon: "🍞", description: "Artisan sourdough" }
  ],
  customers: [
    { id: "cust-0", name: "Walk-in Customer", phone: "", email: "", points: 0, totalSpent: 0 },
    { id: "cust-1", name: "John Doe", phone: "+1 555-0144", email: "john@example.com", points: 120, totalSpent: 1200.0 }
  ]
};

// JSON Fallback Controller
let fallbackData = SEED_DATA;
if (!isSqlite) {
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      fallbackData = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
    } catch (e) {
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(SEED_DATA, null, 2));
    }
  } else {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(SEED_DATA, null, 2));
  }
}

function saveFallback() {
  if (!isSqlite) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackData, null, 2));
  }
}

// Unified Database Methods
const db = {
  isSqlite,
  
  async init() {
    if (!isSqlite) return;
    return new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, storeName TEXT, storeTagline TEXT, storeAddress TEXT, storePhone TEXT, taxId TEXT, currency TEXT, defaultTaxRate REAL, lowStockThreshold INTEGER, receiptFooter TEXT, theme TEXT);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, pin TEXT, avatar TEXT);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT, icon TEXT);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, sku TEXT, barcode TEXT, category TEXT, price REAL, costPrice REAL, taxRate REAL, stock INTEGER, icon TEXT, description TEXT);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, points INTEGER, totalSpent REAL);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, invoiceNumber TEXT, timestamp TEXT, cashier TEXT, customer TEXT, items TEXT, subtotal REAL, tax REAL, discount REAL, grandTotal REAL, paymentMethod TEXT, tenderedAmount REAL, changeDue REAL, status TEXT, refundReason TEXT, refundedAt TEXT);`);
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS held_orders (id TEXT PRIMARY KEY, timestamp TEXT, customer TEXT, items TEXT, discountType TEXT, discountValue REAL, summary TEXT, note TEXT);`);

        sqliteDb.get("SELECT COUNT(*) as count FROM settings;", [], (err, row) => {
          if (!err && row.count === 0) {
            const s = SEED_DATA.settings;
            sqliteDb.run(`INSERT INTO settings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [s.id, s.storeName, s.storeTagline, s.storeAddress, s.storePhone, s.taxId, s.currency, s.defaultTaxRate, s.lowStockThreshold, s.receiptFooter, s.theme]);
            SEED_DATA.users.forEach(u => sqliteDb.run(`INSERT INTO users VALUES (?, ?, ?, ?, ?);`, [u.id, u.name, u.role, u.pin, u.avatar]));
            SEED_DATA.categories.forEach(c => sqliteDb.run(`INSERT INTO categories VALUES (?, ?, ?);`, [c.id, c.name, c.icon]));
            SEED_DATA.products.forEach(p => sqliteDb.run(`INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [p.id, p.name, p.sku, p.barcode, p.category, p.price, p.costPrice, p.taxRate, p.stock, p.icon, p.description]));
            SEED_DATA.customers.forEach(cu => sqliteDb.run(`INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?);`, [cu.id, cu.name, cu.phone, cu.email, cu.points, cu.totalSpent]));
          }
          resolve();
        });
      });
    });
  },

  async all(sql, params = []) {
    if (isSqlite) {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
      });
    }
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : '';
    return fallbackData[table] || [];
  },

  async get(sql, params = []) {
    if (isSqlite) {
      return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
      });
    }
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : '';
    const list = fallbackData[table] || [];
    return list.length > 0 ? list[0] : null;
  },

  async run(sql, params = []) {
    if (isSqlite) {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function(err) {
          err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
    saveFallback();
    return { lastID: Date.now(), changes: 1 };
  },

  async resetToDefaults() {
    if (isSqlite) {
      await this.run("DELETE FROM products;");
      await this.run("DELETE FROM orders;");
      SEED_DATA.products.forEach(async p => {
        await this.run(`INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [p.id, p.name, p.sku, p.barcode, p.category, p.price, p.costPrice, p.taxRate, p.stock, p.icon, p.description]);
      });
    } else {
      fallbackData = SEED_DATA;
      saveFallback();
    }
  }
};

module.exports = { db, SEED_DATA };
