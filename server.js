/**
 * ApexPOS Backend Server
 * Technology Stack: Node.js, Express, SQLite3 (pos.db), CORS
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, SEED_DATA } = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;

let activeUser = {
  id: "usr-1",
  name: "Alex Morgan",
  role: "admin",
  avatar: "AM"
};

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ApexPOS Backend Server',
    databaseEngine: db.isSqlite ? 'SQLite3 (pos.db)' : 'Fallback JSON Storage',
    activeUser: activeUser.name,
    timestamp: new Date().toISOString()
  });
});

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
    if (!userId) return res.status(400).json({ success: false, message: "User ID is required." });
    const user = await db.get("SELECT * FROM users WHERE id = ?;", [userId]);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.pin && user.pin !== pin) return res.status(401).json({ success: false, message: "Incorrect PIN code." });

    activeUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar || user.name.substring(0, 2).toUpperCase()
    };
    res.json({ success: true, message: `Logged in as ${user.name}`, user: activeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/current', (req, res) => res.json({ success: true, user: activeUser }));

app.post('/api/auth/switch', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await db.get("SELECT id, name, role, avatar FROM users WHERE id = ?;", [userId]);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    activeUser = user;
    res.json({ success: true, user: activeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  activeUser = { id: "usr-2", name: "Sarah Connor", role: "cashier", avatar: "SC" };
  res.json({ success: true, message: "Session ended. Switched to default cashier.", user: activeUser });
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, stockFilter } = req.query;
    let products = await db.all("SELECT * FROM products ORDER BY name ASC;");
    if (category && category !== 'all') products = products.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
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

app.get('/api/products/lookup/:code', async (req, res) => {
  try {
    const code = req.params.code.trim();
    const product = await db.get(
      "SELECT * FROM products WHERE LOWER(barcode) = LOWER(?) OR LOWER(sku) = LOWER(?) LIMIT 1;",
      [code, code]
    );
    if (!product) return res.status(404).json({ success: false, message: "No product matches this barcode or SKU." });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.get("SELECT * FROM products WHERE id = ?;", [req.params.id]);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description } = req.body;
    if (!name || price === undefined) return res.status(400).json({ success: false, message: "Product name and price required." });
    const id = req.body.id || `prod-${Date.now()}`;
    const generatedSku = sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedBarcode = barcode || String(Math.floor(1000000000 + Math.random() * 9000000000));

    await db.run(
      `INSERT INTO products (id, name, sku, barcode, category, price, costPrice, taxRate, stock, icon, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, name.trim(), generatedSku, generatedBarcode, category || 'beverages', parseFloat(price) || 0, parseFloat(costPrice) || 0, taxRate !== undefined ? parseFloat(taxRate) : 5.0, parseInt(stock) || 0, icon || '📦', description || '']
    );
    const newProduct = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    res.status(201).json({ success: true, message: "Product created successfully.", product: newProduct });
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
    res.json({ success: true, message: "Product updated successfully.", product: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { qtyDelta, stock } = req.body;
    const existing = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found." });

    let newStock = existing.stock;
    if (stock !== undefined) newStock = Math.max(0, parseInt(stock) || 0);
    else if (qtyDelta !== undefined) newStock = Math.max(0, existing.stock + (parseInt(qtyDelta) || 0));

    await db.run("UPDATE products SET stock = ? WHERE id = ?;", [newStock, id]);
    const updated = await db.get("SELECT * FROM products WHERE id = ?;", [id]);
    res.json({ success: true, message: "Stock updated.", product: updated });
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
    res.json({ success: true, message: `Product ${existing.name} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all("SELECT * FROM categories;");
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { id, name, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Category name required." });
    const catId = id || `cat-${Date.now()}`;
    await db.run("INSERT OR REPLACE INTO categories (id, name, icon) VALUES (?, ?, ?);", [catId, name, icon || '🛍️']);
    const category = await db.get("SELECT * FROM categories WHERE id = ?;", [catId]);
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let customers = await db.all("SELECT * FROM customers ORDER BY totalSpent DESC;");
    if (search) {
      const q = search.toLowerCase().trim();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await db.get("SELECT * FROM customers WHERE id = ?;", [req.params.id]);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email, points, totalSpent } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Customer name is required." });
    const id = req.body.id || `cust-${Date.now()}`;
    await db.run("INSERT INTO customers (id, name, phone, email, points, totalSpent) VALUES (?, ?, ?, ?, ?, ?);", [id, name.trim(), phone ? phone.trim() : '', email ? email.trim() : '', parseInt(points) || 0, parseFloat(totalSpent) || 0]);
    const newCustomer = await db.get("SELECT * FROM customers WHERE id = ?;", [id]);
    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get("SELECT * FROM customers WHERE id = ?;", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Customer not found." });
    const { name, phone, email, points } = req.body;
    await db.run("UPDATE customers SET name = ?, phone = ?, email = ?, points = ? WHERE id = ?;", [name !== undefined ? name.trim() : existing.name, phone !== undefined ? phone.trim() : existing.phone, email !== undefined ? email.trim() : existing.email, points !== undefined ? parseInt(points) : existing.points, id]);
    const updated = await db.get("SELECT * FROM customers WHERE id = ?;", [id]);
    res.json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/customers/:id/points', async (req, res) => {
  try {
    const { id } = req.params;
    const { pointsDelta, spendAmount, redeemPoints } = req.body;
    const customer = await db.get("SELECT * FROM customers WHERE id = ?;", [id]);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });

    let newPoints = customer.points;
    let newTotalSpent = customer.totalSpent;
    if (redeemPoints) {
      if (customer.points < redeemPoints) return res.status(400).json({ success: false, message: "Insufficient points balance." });
      newPoints -= redeemPoints;
    } else {
      if (pointsDelta) newPoints += pointsDelta;
      if (spendAmount) newTotalSpent += spendAmount;
    }

    await db.run("UPDATE customers SET points = ?, totalSpent = ? WHERE id = ?;", [newPoints, newTotalSpent, id]);
    const updated = await db.get("SELECT * FROM customers WHERE id = ?;", [id]);
    res.json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { cashier, customer, items, subtotal, tax, discount, grandTotal, paymentMethod, tenderedAmount, changeDue } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: "Cart is empty." });

    for (const item of items) {
      const prod = await db.get("SELECT stock, name FROM products WHERE id = ?;", [item.id]);
      if (prod && prod.stock < item.qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock for '${prod.name}'. Only ${prod.stock} left.` });
      }
    }

    for (const item of items) {
      await db.run("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?;", [item.qty, item.id]);
    }

    const countRow = await db.get("SELECT COUNT(*) as count FROM orders;");
    const count = (countRow ? countRow.count : 0) + 1;
    const year = new Date().getFullYear();
    const orderId = req.body.id || `ORD-${1000 + count}`;
    const invoiceNumber = req.body.invoiceNumber || `INV-${year}-${String(count).padStart(4, "0")}`;
    const timestamp = new Date().toISOString();

    if (customer && customer.id && customer.id !== "cust-0") {
      const pointsEarned = Math.floor(grandTotal / 10);
      await db.run("UPDATE customers SET points = points + ?, totalSpent = totalSpent + ? WHERE id = ?;", [pointsEarned, grandTotal, customer.id]);
    }

    await db.run(
      `INSERT INTO orders (id, invoiceNumber, timestamp, cashier, customer, items, subtotal, tax, discount, grandTotal, paymentMethod, tenderedAmount, changeDue, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
    const { status, paymentMethod, search } = req.query;
    const rawOrders = await db.all("SELECT * FROM orders ORDER BY timestamp DESC;");
    let orders = rawOrders.map(o => {
      let customer = o.customer;
      let items = o.items;
      try { customer = JSON.parse(o.customer); } catch (e) {}
      try { items = JSON.parse(o.items); } catch (e) {}
      return { ...o, customer, items };
    });

    if (status && status !== 'all') orders = orders.filter(o => o.status === status);
    if (paymentMethod && paymentMethod !== 'all') orders = orders.filter(o => o.paymentMethod === paymentMethod);
    if (search) {
      const q = search.toLowerCase().trim();
      orders = orders.filter(o => o.invoiceNumber.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || (o.customer?.name && o.customer.name.toLowerCase().includes(q)) || (o.cashier && o.cashier.toLowerCase().includes(q)));
    }
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await db.get("SELECT * FROM orders WHERE id = ?;", [req.params.id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    try { order.customer = JSON.parse(order.customer); } catch (e) {}
    try { order.items = JSON.parse(order.items); } catch (e) {}
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await db.get("SELECT * FROM orders WHERE id = ?;", [id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    if (order.status === 'refunded') return res.status(400).json({ success: false, message: "Already refunded." });

    let items = [];
    try { items = JSON.parse(order.items); } catch (e) {}
    for (const item of items) {
      await db.run("UPDATE products SET stock = stock + ? WHERE id = ?;", [item.qty, item.id]);
    }

    const refundedAt = new Date().toISOString();
    const refundReason = reason || "Customer return";
    await db.run("UPDATE orders SET status = 'refunded', refundReason = ?, refundedAt = ? WHERE id = ?;", [refundReason, refundedAt, id]);

    const updated = await db.get("SELECT * FROM orders WHERE id = ?;", [id]);
    try { updated.customer = JSON.parse(updated.customer); } catch (e) {}
    try { updated.items = JSON.parse(updated.items); } catch (e) {}
    res.json({ success: true, message: `Order #${updated.invoiceNumber} refunded.`, order: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
      `INSERT INTO held_orders (id, timestamp, customer, items, discountType, discountValue, summary, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
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

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const settings = (await db.get("SELECT * FROM settings WHERE id = 1;")) || SEED_DATA.settings;
    const rawOrders = await db.all("SELECT * FROM orders WHERE status = 'completed';");
    const products = await db.all("SELECT * FROM products;");

    const orders = rawOrders.map(o => {
      try { o.items = JSON.parse(o.items); } catch (e) {}
      try { o.customer = JSON.parse(o.customer); } catch (e) {}
      return o;
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOrdersCount = orders.length;
    const avgOrderValue = todayOrders.length > 0 ? (todayRevenue / todayOrders.length) : 0;
    const lowStockCount = products.filter(p => p.stock <= (settings.lowStockThreshold || 10)).length;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklySales = [120, 190, 240, 310, 420, 580, 490];
    const todayDayIdx = (new Date().getDay() + 6) % 7;
    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    weeklySales[todayDayIdx] = Math.max(weeklySales[todayDayIdx], totalRevenue);

    const categoryTotals = {};
    const prodMap = {};
    products.forEach(p => { prodMap[p.id] = p; });

    orders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(it => {
          const prod = prodMap[it.id];
          const cat = prod ? prod.category : 'other';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (it.total || (it.price * it.qty));
        });
      }
    });

    const itemMap = {};
    orders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(it => {
          if (!itemMap[it.id]) itemMap[it.id] = { id: it.id, name: it.name, count: 0, revenue: 0 };
          itemMap[it.id].count += it.qty;
          itemMap[it.id].revenue += it.total || (it.price * it.qty);
        });
      }
    });
    const topProducts = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);

    const recentOrders = await db.all("SELECT * FROM orders ORDER BY timestamp DESC LIMIT 5;");
    const recentTransactions = recentOrders.map(o => {
      try { o.customer = JSON.parse(o.customer); } catch (e) {}
      try { o.items = JSON.parse(o.items); } catch (e) {}
      return o;
    });

    res.json({
      success: true,
      kpis: {
        todayRevenue: Number(todayRevenue.toFixed(2)),
        totalOrdersCount,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        lowStockCount,
        currency: settings.currency || "₹"
      },
      charts: { weeklySales: { labels: days, data: weeklySales }, categoryShare: categoryTotals },
      topProducts,
      recentTransactions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await db.get("SELECT * FROM settings WHERE id = 1;");
    if (!settings) settings = SEED_DATA.settings;
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const existing = (await db.get("SELECT * FROM settings WHERE id = 1;")) || SEED_DATA.settings;
    const { storeName, storeTagline, storeAddress, storePhone, taxId, currency, defaultTaxRate, lowStockThreshold, receiptFooter, theme } = req.body;

    await db.run(
      `UPDATE settings SET storeName = ?, storeTagline = ?, storeAddress = ?, storePhone = ?, taxId = ?, currency = ?, defaultTaxRate = ?, lowStockThreshold = ?, receiptFooter = ?, theme = ? WHERE id = 1;`,
      [storeName !== undefined ? storeName : existing.storeName, storeTagline !== undefined ? storeTagline : existing.storeTagline, storeAddress !== undefined ? storeAddress : existing.storeAddress, storePhone !== undefined ? storePhone : existing.storePhone, taxId !== undefined ? taxId : existing.taxId, currency !== undefined ? currency : existing.currency, defaultTaxRate !== undefined ? parseFloat(defaultTaxRate) : existing.defaultTaxRate, lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : existing.lowStockThreshold, receiptFooter !== undefined ? receiptFooter : existing.receiptFooter, theme !== undefined ? theme : existing.theme]
    );
    const updated = await db.get("SELECT * FROM settings WHERE id = 1;");
    res.json({ success: true, message: "Settings updated successfully.", settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/reset', async (req, res) => {
  try {
    await db.resetToDefaults();
    res.json({ success: true, message: "Database reset back to default demo catalog." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback SPA route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: "API endpoint not found." });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server Initialization
async function startServer() {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`🚀 ApexPOS Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
  }
}

startServer();

module.exports = app;
