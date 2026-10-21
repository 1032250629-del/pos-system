/**
 * ApexPOS Backend Server & Static Asset Provider
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, SEED_DATA } = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;

let activeUser = { id: "usr-1", name: "Alex Morgan", role: "admin", avatar: "AM" };

// Global CORS & Middleware
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ApexPOS Backend Server',
    databaseEngine: db.isSqlite ? 'SQLite3 (pos.db)' : 'Fallback JSON Storage',
    activeUser: activeUser.name,
    timestamp: new Date().toISOString()
  });
});

// Auth Endpoints
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await db.all("SELECT id, name, role, avatar FROM users;");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "User ID required." });
    const user = await db.get("SELECT * FROM users WHERE id = ?;", [userId]);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.pin && user.pin !== pin) return res.status(401).json({ success: false, message: "Incorrect PIN." });

    activeUser = { id: user.id, name: user.name, role: user.role, avatar: user.avatar || user.name.substring(0, 2).toUpperCase() };
    res.json({ success: true, message: `Logged in as ${user.name}`, user: activeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/current', (req, res) => res.json({ success: true, user: activeUser }));

// Products Endpoints
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, stockFilter } = req.query;
    let products = await db.all("SELECT * FROM products ORDER BY name ASC;");
    if (category && category !== 'all') products = products.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase().trim();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.barcode && p.barcode.toLowerCase().includes(q)));
    }
    if (stockFilter === 'low') {
      const settings = await db.get("SELECT lowStockThreshold FROM settings WHERE id = 1;");
      const threshold = settings ? settings.lowStockThreshold : 10;
      products = products.filter(p => p.stock > 0 && p.stock <= threshold);
    } else if (stockFilter === 'out') {
      products = products.filter(p => p.stock <= 0);
    }
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description } = req.body;
    if (!name || price === undefined) return res.status(400).json({ success: false, message: "Name and price required." });
    const id = req.body.id || `prod-${Date.now()}`;
    const generatedSku = sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedBarcode = barcode || String(Math.floor(1000000000 + Math.random() * 9000000000));

    await db.run(
      `INSERT INTO products (id, name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, name.trim(), generatedSku, generatedBarcode, category || 'beverages', parseFloat(price) || 0, parseFloat(costPrice) || 0, taxRate !== undefined ? parseFloat(taxRate) : 5.0, parseInt(stock) || 0, icon || '📦', description || '']
    );
    const newProduct = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found." });
    const { name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description } = req.body;

    await db.run(
      `UPDATE products SET name = ?, sku = ?, barcode = ?, category = ?, price = ?, costPrice = ?, taxRate = ?, stock = ?, icon = ?, description = ? WHERE id = ?;`,
      [name !== undefined ? name.trim() : existing.name, sku !== undefined ? sku.trim() : existing.sku, barcode !== undefined ? barcode.trim() : existing.barcode, category !== undefined ? category : existing.category, price !== undefined ? parseFloat(price) : existing.price, costPrice !== undefined ? parseFloat(costPrice) : existing.costPrice, taxRate !== undefined ? parseFloat(taxRate) : existing.taxRate, stock !== undefined ? parseInt(stock) : existing.stock, icon !== undefined ? icon : existing.icon, description !== undefined ? description : existing.description, id]
    );
    const updated = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found." });
    await db.run("DELETE FROM products WHERE id = ?;", [id]);
    res.json({ success: true, message: "Product deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Categories Endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all("SELECT * FROM categories;");
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customers Endpoints
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.all("SELECT * FROM customers ORDER BY totalSpent DESC;");
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Orders Endpoints
app.post('/api/orders', async (req, res) => {
  try {
    const { cashier, customer, items, subtotal, tax, discount, grandTotal, paymentMethod, tenderedAmount, changeDue } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: "Cart is empty." });

    for (const item of items) {
      await db.run("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?;", [item.qty, item.id]);
    }

    const countRow = await db.get("SELECT COUNT(*) as count FROM orders;");
    const count = (countRow ? countRow.count : 0) + 1;
    const year = new Date().getFullYear();
    const orderId = req.body.id || `ORD-${1000 + count}`;
    const invoiceNumber = req.body.invoiceNumber || `INV-${year}-${String(count).padStart(4, "0")}`;
    const timestamp = new Date().toISOString();

    await db.run(
      `INSERT INTO orders (id, invoiceNumber, timestamp, cashier, customer, items, subtotal, tax, discount, grandTotal, paymentMethod, tenderedAmount, changeDue, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [orderId, invoiceNumber, timestamp, cashier || activeUser.name, JSON.stringify(customer || { id: "cust-0", name: "Walk-in Customer" }), JSON.stringify(items), parseFloat(subtotal) || 0, parseFloat(tax) || 0, parseFloat(discount) || 0, parseFloat(grandTotal) || 0, paymentMethod || 'cash', parseFloat(tenderedAmount) || grandTotal, parseFloat(changeDue) || 0, 'completed']
    );

    const settings = await db.get("SELECT * FROM settings WHERE id = 1;");
    const completedOrder = { id: orderId, invoiceNumber, timestamp, cashier: cashier || activeUser.name, customer: customer || { id: "cust-0", name: "Walk-in Customer" }, items, subtotal: parseFloat(subtotal) || 0, tax: parseFloat(tax) || 0, discount: parseFloat(discount) || 0, grandTotal: parseFloat(grandTotal) || 0, paymentMethod: paymentMethod || 'cash', tenderedAmount: parseFloat(tenderedAmount) || grandTotal, changeDue: parseFloat(changeDue) || 0, status: 'completed' };

    res.status(201).json({ success: true, message: "Order placed successfully.", order: completedOrder, receipt: { store: settings, order: completedOrder } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const rawOrders = await db.all("SELECT * FROM orders ORDER BY timestamp DESC;");
    const orders = rawOrders.map(o => {
      let customer = o.customer, items = o.items;
      try { customer = JSON.parse(o.customer); } catch (e) {}
      try { items = JSON.parse(o.items); } catch (e) {}
      return { ...o, customer, items };
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Held Orders Endpoints
app.get('/api/held-orders', async (req, res) => {
  try {
    const raw = await db.all("SELECT * FROM held_orders ORDER BY timestamp DESC;");
    const heldOrders = raw.map(h => {
      let customer = h.customer, items = h.items, summary = h.summary;
      try { customer = JSON.parse(h.customer); } catch (e) {}
      try { items = JSON.parse(h.items); } catch (e) {}
      try { summary = JSON.parse(h.summary); } catch (e) {}
      return { ...h, customer, items, summary };
    });
    res.json({ success: true, heldOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/held-orders', async (req, res) => {
  try {
    const { items, customer, discountType, discountValue, summary, note } = req.body;
    const id = `HOLD-${Date.now()}`;
    const timestamp = new Date().toISOString();
    await db.run(
      `INSERT INTO held_orders (id, timestamp, customer, items, discountType, discountValue, summary, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, timestamp, JSON.stringify(customer || { id: "cust-0", name: "Walk-in Customer" }), JSON.stringify(items || []), discountType || 'percent', parseFloat(discountValue) || 0, JSON.stringify(summary || {}), note || `Held bill #${id}`]
    );
    res.status(201).json({ success: true, heldOrder: { id, timestamp, customer, items, discountType, discountValue, summary, note } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/held-orders/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM held_orders WHERE id = ?;", [req.params.id]);
    res.json({ success: true, message: "Held bill cleared." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dashboard Analytics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const settings = (await db.get("SELECT * FROM settings WHERE id = 1;")) || SEED_DATA.settings;
    const rawOrders = await db.all("SELECT * FROM orders WHERE status = 'completed';");
    const products = await db.all("SELECT * FROM products;");

    const orders = rawOrders.map(o => {
      try { o.items = JSON.parse(o.items); } catch (e) {}
      return o;
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    res.json({
      success: true,
      kpis: {
        todayRevenue: Number(todayRevenue.toFixed(2)),
        totalOrdersCount: orders.length,
        avgOrderValue: todayOrders.length > 0 ? Number((todayRevenue / todayOrders.length).toFixed(2)) : 0,
        lowStockCount: products.filter(p => p.stock <= (settings.lowStockThreshold || 10)).length,
        currency: settings.currency || "₹"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settings Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await db.get("SELECT * FROM settings WHERE id = 1;");
    if (!settings) settings = SEED_DATA.settings;
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-All SPA Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: "API endpoint not found." });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server Startup
async function startServer() {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`🚀 ApexPOS Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup error:", error);
  }
}

startServer();

module.exports = app;
