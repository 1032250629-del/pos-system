/**
 * ApexPOS Storage & API Service Layer
 * Connects frontend views directly to the Node.js + Express + SQLite backend.
 * Features optimistic UI caching, automated background sync, and offline persistence.
 */

// Dynamically resolve Backend API endpoint
const API_BASE = (function () {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.protocol.startsWith("http") && window.location.port === "3000") {
      return "/api";
    }
  }
  return "http://localhost:3000/api";
})();

const STORAGE_KEYS = {
  SETTINGS: "pos_settings_v2",
  USERS: "pos_users_v2",
  CATEGORIES: "pos_categories_v2",
  PRODUCTS: "pos_products_v2",
  CUSTOMERS: "pos_customers_v2",
  ORDERS: "pos_orders_v2",
  HELD_ORDERS: "pos_held_orders_v2",
  ACTIVE_USER: "pos_active_user_v2"
};

const DB = {
  isOnline: false,
  _syncTimer: null,

  /**
   * Initialize local cache and synchronize with the Express backend
   */
  async init() {
    // 1. Immediate local cache population
    this._hydrateFromLocalStorage();

    // 2. Initial synchronization with Express Backend API
    await this.syncFromBackend();

    // 3. Periodic background sync polling (every 15 seconds)
    if (!this._syncTimer) {
      this._syncTimer = setInterval(() => {
        this.syncFromBackend(true);
      }, 15000);
    }
  },

  _hydrateFromLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS) && typeof SEED_DATA !== "undefined") {
      this.resetToDefaultsLocal();
    }
  },

  resetToDefaultsLocal() {
    if (typeof SEED_DATA === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(SEED_DATA.settings));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_DATA.users));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(SEED_DATA.categories));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_DATA.products));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_DATA.customers));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(SEED_DATA.orders));
    localStorage.setItem(STORAGE_KEYS.HELD_ORDERS, JSON.stringify(SEED_DATA.heldOrders || []));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(SEED_DATA.users[0]));
  },

  async resetToDefaults() {
    try {
      await this.api('/settings/reset', { method: 'POST' });
      await this.syncFromBackend();
    } catch (e) {
      this.resetToDefaultsLocal();
    }
  },

  /**
   * Generic Fetch Wrapper
   */
  async api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
      "Content-Type": "application/json"
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    const res = await fetch(url, config);
    if (!res.ok) {
      let errMessage = `HTTP Error ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.message) errMessage = errorJson.message;
      } catch (_) {}
      throw new Error(errMessage);
    }

    return await res.json();
  },

  /**
   * Fetch all records from the Express backend and sync local cache
   */
  async syncFromBackend(silent = false) {
    try {
      const [settingsRes, categoriesRes, productsRes, customersRes, ordersRes, heldRes, usersRes] = await Promise.all([
        this.api('/settings'),
        this.api('/categories'),
        this.api('/products'),
        this.api('/customers'),
        this.api('/orders'),
        this.api('/held-orders'),
        this.api('/auth/users')
      ]);

      if (settingsRes?.settings) this._set(STORAGE_KEYS.SETTINGS, settingsRes.settings);
      if (categoriesRes?.categories) this._set(STORAGE_KEYS.CATEGORIES, categoriesRes.categories);
      if (productsRes?.products) this._set(STORAGE_KEYS.PRODUCTS, productsRes.products);
      if (customersRes?.customers) this._set(STORAGE_KEYS.CUSTOMERS, customersRes.customers);
      if (ordersRes?.orders) this._set(STORAGE_KEYS.ORDERS, ordersRes.orders);
      if (heldRes?.heldOrders) this._set(STORAGE_KEYS.HELD_ORDERS, heldRes.heldOrders);
      if (usersRes?.users) this._set(STORAGE_KEYS.USERS, usersRes.users);

      this.isOnline = true;
      this.updateStatusBadge(true);
      if (!silent) console.log("✅ [DB] Successfully synchronized with Express + SQLite Backend");
      return true;
    } catch (err) {
      this.isOnline = false;
      this.updateStatusBadge(false);
      if (!silent) console.warn("⚠️ [DB] Backend server not reachable, operating in offline cache mode:", err.message);
      return false;
    }
  },

  updateStatusBadge(isOnline) {
    const pill = document.getElementById("backend-status-pill");
    if (!pill) return;

    if (isOnline) {
      pill.className = "server-status-pill online";
      pill.innerHTML = `<span class="status-dot"></span><span>Backend: SQLite Live</span>`;
      pill.title = "Connected to Express Backend & SQLite Database";
    } else {
      pill.className = "server-status-pill offline";
      pill.innerHTML = `<span class="status-dot"></span><span>Backend: Offline (Cache)</span>`;
      pill.title = "Backend unreachable. Click to retry connecting to http://localhost:3000";
      pill.onclick = () => this.syncFromBackend();
    }
  },

  // Cache Accessors
  _get(key, defaultValue = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  // -------------------------------------------------------------
  // PRODUCTS REPOSITORY
  // -------------------------------------------------------------
  products: {
    getAll() {
      return DB._get(STORAGE_KEYS.PRODUCTS, (typeof SEED_DATA !== "undefined" ? SEED_DATA.products : []));
    },

    getById(id) {
      return this.getAll().find(p => p.id === id) || null;
    },

    getByBarcodeOrSku(code) {
      if (!code) return null;
      const clean = code.trim().toLowerCase();
      return this.getAll().find(p =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        (p.sku && p.sku.toLowerCase() === clean)
      ) || null;
    },

    getByCategory(categoryId) {
      const all = this.getAll();
      if (!categoryId || categoryId === "all") return all;
      return all.filter(p => p.category === categoryId);
    },

    async save(product) {
      let saved = { ...product };
      const products = this.getAll();

      try {
        if (product.id && products.some(p => p.id === product.id)) {
          const res = await DB.api(`/products/${product.id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
          });
          if (res.product) saved = res.product;
        } else {
          const res = await DB.api('/products', {
            method: 'POST',
            body: JSON.stringify(product)
          });
          if (res.product) saved = res.product;
        }
      } catch (e) {
        if (!saved.id) saved.id = "prod-" + Date.now();
      }

      // Update local storage cache
      const index = products.findIndex(p => p.id === saved.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...saved };
      } else {
        products.push(saved);
      }
      DB._set(STORAGE_KEYS.PRODUCTS, products);

      return saved;
    },

    async delete(id) {
      try {
        await DB.api(`/products/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn("Backend delete skipped:", e.message);
      }
      const products = this.getAll().filter(p => p.id !== id);
      DB._set(STORAGE_KEYS.PRODUCTS, products);
      return true;
    },

    async updateStock(id, qtyDelta) {
      const products = this.getAll();
      const product = products.find(p => p.id === id);
      if (product) {
        product.stock = Math.max(0, (product.stock || 0) + qtyDelta);
        DB._set(STORAGE_KEYS.PRODUCTS, products);
      }

      try {
        const res = await DB.api(`/products/${id}/stock`, {
          method: 'PATCH',
          body: JSON.stringify({ qtyDelta })
        });
        if (res.product) {
          const idx = products.findIndex(p => p.id === id);
          if (idx !== -1) products[idx] = res.product;
          DB._set(STORAGE_KEYS.PRODUCTS, products);
          return res.product;
        }
      } catch (e) {}

      return product;
    }
  },

  // -------------------------------------------------------------
  // CATEGORIES REPOSITORY
  // -------------------------------------------------------------
  categories: {
    getAll() {
      return DB._get(STORAGE_KEYS.CATEGORIES, (typeof SEED_DATA !== "undefined" ? SEED_DATA.categories : []));
    },

    async save(category) {
      let saved = { ...category };
      try {
        const res = await DB.api('/categories', {
          method: 'POST',
          body: JSON.stringify(category)
        });
        if (res.category) saved = res.category;
      } catch (e) {
        if (!saved.id) saved.id = "cat-" + Date.now();
      }

      const categories = this.getAll();
      const idx = categories.findIndex(c => c.id === saved.id);
      if (idx !== -1) categories[idx] = saved;
      else categories.push(saved);
      DB._set(STORAGE_KEYS.CATEGORIES, categories);

      return saved;
    }
  },

  // -------------------------------------------------------------
  // ORDERS / TRANSACTIONS REPOSITORY
  // -------------------------------------------------------------
  orders: {
    getAll() {
      return DB._get(STORAGE_KEYS.ORDERS, (typeof SEED_DATA !== "undefined" ? SEED_DATA.orders : []));
    },

    getById(id) {
      return this.getAll().find(o => o.id === id) || null;
    },

    async create(orderData) {
      let completedOrder = null;

      try {
        const res = await DB.api('/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
        if (res.success && res.order) {
          completedOrder = res.order;
        }
      } catch (e) {
        console.warn("Backend checkout unreachable, processing locally:", e.message);
      }

      // Offline fallback order generation
      if (!completedOrder) {
        const orders = this.getAll();
        const count = orders.length + 1;
        completedOrder = {
          id: "ORD-" + (1000 + count),
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`,
          timestamp: new Date().toISOString(),
          status: "completed",
          ...orderData
        };
      }

      // Save into orders cache
      const orders = this.getAll();
      const existingIdx = orders.findIndex(o => o.id === completedOrder.id);
      if (existingIdx !== -1) orders[existingIdx] = completedOrder;
      else orders.unshift(completedOrder);
      DB._set(STORAGE_KEYS.ORDERS, orders);

      // Decrement inventory stock locally
      if (completedOrder.items && Array.isArray(completedOrder.items)) {
        completedOrder.items.forEach(item => {
          const p = DB.products.getById(item.id);
          if (p) p.stock = Math.max(0, (p.stock || 0) - item.qty);
        });
        DB._set(STORAGE_KEYS.PRODUCTS, DB.products.getAll());
      }

      // Update customer loyalty points locally
      if (completedOrder.customer && completedOrder.customer.id && completedOrder.customer.id !== "cust-0") {
        const pointsEarned = Math.floor(completedOrder.grandTotal / 10);
        DB.customers.addPoints(completedOrder.customer.id, pointsEarned, completedOrder.grandTotal);
      }

      return completedOrder;
    },

    async refund(orderId, reason = "Customer return") {
      let serverOrder = null;
      try {
        const res = await DB.api(`/orders/${orderId}/refund`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
        if (res.success && res.order) {
          serverOrder = res.order;
        }
      } catch (e) {
        console.warn("Backend refund failed, applying locally:", e.message);
      }

      const orders = this.getAll();
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== "refunded") {
        order.status = "refunded";
        order.refundReason = reason;
        order.refundedAt = new Date().toISOString();
        if (serverOrder) Object.assign(order, serverOrder);
        DB._set(STORAGE_KEYS.ORDERS, orders);

        // Restock inventory
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const p = DB.products.getById(item.id);
            if (p) p.stock = (p.stock || 0) + item.qty;
          });
          DB._set(STORAGE_KEYS.PRODUCTS, DB.products.getAll());
        }
        return order;
      }
      return serverOrder || order;
    }
  },

  // -------------------------------------------------------------
  // HELD ORDERS (PARKED BILLS)
  // -------------------------------------------------------------
  heldOrders: {
    getAll() {
      return DB._get(STORAGE_KEYS.HELD_ORDERS, []);
    },

    async add(heldOrder) {
      let created = null;
      try {
        const res = await DB.api('/held-orders', {
          method: 'POST',
          body: JSON.stringify(heldOrder)
        });
        if (res.heldOrder) created = res.heldOrder;
      } catch (e) {}

      if (!created) {
        created = {
          id: "HOLD-" + Date.now(),
          timestamp: new Date().toISOString(),
          ...heldOrder
        };
      }

      const list = this.getAll();
      list.push(created);
      DB._set(STORAGE_KEYS.HELD_ORDERS, list);
      return created;
    },

    async remove(id) {
      try {
        await DB.api(`/held-orders/${id}`, { method: 'DELETE' });
      } catch (e) {}

      const list = this.getAll().filter(h => h.id !== id);
      DB._set(STORAGE_KEYS.HELD_ORDERS, list);
      return true;
    },

    getById(id) {
      return this.getAll().find(h => h.id === id) || null;
    }
  },

  // -------------------------------------------------------------
  // CUSTOMERS REPOSITORY
  // -------------------------------------------------------------
  customers: {
    getAll() {
      return DB._get(STORAGE_KEYS.CUSTOMERS, (typeof SEED_DATA !== "undefined" ? SEED_DATA.customers : []));
    },

    getById(id) {
      return this.getAll().find(c => c.id === id) || null;
    },

    async save(customer) {
      let saved = { ...customer };
      try {
        if (customer.id && this.getById(customer.id)) {
          const res = await DB.api(`/customers/${customer.id}`, {
            method: 'PUT',
            body: JSON.stringify(customer)
          });
          if (res.customer) saved = res.customer;
        } else {
          const res = await DB.api('/customers', {
            method: 'POST',
            body: JSON.stringify(customer)
          });
          if (res.customer) saved = res.customer;
        }
      } catch (e) {
        if (!saved.id) saved.id = "cust-" + Date.now();
      }

      const list = this.getAll();
      const idx = list.findIndex(c => c.id === saved.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...saved };
      else list.push(saved);
      DB._set(STORAGE_KEYS.CUSTOMERS, list);

      return saved;
    },

    async addPoints(id, points, spendAmount) {
      const list = this.getAll();
      const c = list.find(cust => cust.id === id);
      if (c) {
        c.points = (c.points || 0) + points;
        c.totalSpent = (c.totalSpent || 0) + spendAmount;
        DB._set(STORAGE_KEYS.CUSTOMERS, list);
      }

      try {
        await DB.api(`/customers/${id}/points`, {
          method: 'PATCH',
          body: JSON.stringify({ pointsDelta: points, spendAmount })
        });
      } catch (e) {}
    },

    async redeemPoints(id, pointsToRedeem) {
      const list = this.getAll();
      const c = list.find(cust => cust.id === id);
      if (c && c.points >= pointsToRedeem) {
        c.points -= pointsToRedeem;
        DB._set(STORAGE_KEYS.CUSTOMERS, list);
        try {
          await DB.api(`/customers/${id}/points`, {
            method: 'PATCH',
            body: JSON.stringify({ redeemPoints: pointsToRedeem })
          });
        } catch (e) {}
        return true;
      }
      return false;
    }
  },

  // -------------------------------------------------------------
  // USERS & AUTH
  // -------------------------------------------------------------
  users: {
    getAll() {
      return DB._get(STORAGE_KEYS.USERS, (typeof SEED_DATA !== "undefined" ? SEED_DATA.users : []));
    },

    getById(id) {
      return this.getAll().find(u => u.id === id) || null;
    }
  },

  auth: {
    getActiveUser() {
      const defaultUser = (typeof SEED_DATA !== "undefined" ? SEED_DATA.users[0] : { id: "usr-1", name: "Alex Morgan", role: "admin" });
      return DB._get(STORAGE_KEYS.ACTIVE_USER, defaultUser);
    },

    async setActiveUser(user) {
      DB._set(STORAGE_KEYS.ACTIVE_USER, user);
      try {
        await DB.api('/auth/switch', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id })
        });
      } catch (e) {}
    }
  },

  // -------------------------------------------------------------
  // STORE SETTINGS
  // -------------------------------------------------------------
  settings: {
    get() {
      return DB._get(STORAGE_KEYS.SETTINGS, (typeof SEED_DATA !== "undefined" ? SEED_DATA.settings : {}));
    },

    async update(newSettings) {
      const current = this.get();
      const updated = { ...current, ...newSettings };
      DB._set(STORAGE_KEYS.SETTINGS, updated);

      try {
        const res = await DB.api('/settings', {
          method: 'PUT',
          body: JSON.stringify(updated)
        });
        if (res.settings) {
          DB._set(STORAGE_KEYS.SETTINGS, res.settings);
          return res.settings;
        }
      } catch (e) {
        console.warn("Could not save settings to backend:", e.message);
      }

      return updated;
    }
  }
};

// Immediate baseline cache readiness
DB._hydrateFromLocalStorage();
