/**
 * Data Storage & API Sync Layer
 */

const DB = {
  isOnline: false,
  baseUrl: "/api",

  async init() {
    await this.checkHealth();
    if (this.isOnline) {
      await this.syncFromBackend();
    }
  },

  async checkHealth() {
    const statusPill = document.getElementById("backend-status-pill");
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "online") {
          this.isOnline = true;
          if (statusPill) {
            statusPill.className = "server-status-pill online";
            statusPill.innerHTML = `<span class="status-dot"></span><span>Backend: SQLite Live</span>`;
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Backend offline:", err);
    }

    this.isOnline = false;
    if (statusPill) {
      statusPill.className = "server-status-pill offline";
      statusPill.innerHTML = `<span class="status-dot"></span><span>Backend: Offline (Cache)</span>`;
    }
  },

  async syncFromBackend() {
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        fetch(`${this.baseUrl}/products`),
        fetch(`${this.baseUrl}/categories`),
        fetch(`${this.baseUrl}/customers`)
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const items = prodData.products || prodData;
        if (Array.isArray(items) && items.length > 0) {
          this.products.setAll(items);
        }
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        const categories = catData.categories || catData;
        if (Array.isArray(categories) && categories.length > 0) {
          this.categories.setAll(categories);
        }
      }

      if (custRes.ok) {
        const custData = await custRes.json();
        const customers = custData.customers || custData;
        if (Array.isArray(customers) && customers.length > 0) {
          this.customers.setAll(customers);
        }
      }
    } catch (err) {
      console.error("Error syncing backend data:", err);
    }
  },

  products: {
    getAll() {
      try {
        const data = localStorage.getItem("pos_products");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}

      return [
        { id: "p1", name: "Artisan Cappuccino", price: 220, stock: 45, category: "beverages", icon: "☕", sku: "BEV-001" },
        { id: "p2", name: "Cold Brew Coffee", price: 250, stock: 30, category: "beverages", icon: "🥤", sku: "BEV-002" },
        { id: "p3", name: "Butter Croissant", price: 140, stock: 20, category: "bakery", icon: "🥐", sku: "BAK-001" },
        { id: "p4", name: "Blueberry Muffin", price: 160, stock: 15, category: "bakery", icon: "🧁", sku: "BAK-002" },
        { id: "p5", name: "Avocado Sourdough Toast", price: 320, stock: 12, category: "snacks", icon: "🥑", sku: "SNK-001" },
        { id: "p6", name: "Club Sandwich", price: 280, stock: 18, category: "snacks", icon: "🥪", sku: "SNK-002" }
      ];
    },
    getById(id) {
      return this.getAll().find(p => p.id === id);
    },
    setAll(data) {
      if (Array.isArray(data)) {
        localStorage.setItem("pos_products", JSON.stringify(data));
      }
    }
  },

  categories: {
    getAll() {
      try {
        const data = localStorage.getItem("pos_categories");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}

      return [
        { id: "all", name: "All Items", icon: "🏷️" },
        { id: "beverages", name: "Beverages", icon: "☕" },
        { id: "bakery", name: "Bakery & Sweets", icon: "🥐" },
        { id: "snacks", name: "Snacks & Food", icon: "🍔" }
      ];
    },
    setAll(data) {
      if (Array.isArray(data)) {
        localStorage.setItem("pos_categories", JSON.stringify(data));
      }
    }
  },

  customers: {
    getAll() {
      try {
        const data = localStorage.getItem("pos_customers");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
      return [{ id: "cust-0", name: "Walk-in Customer", phone: "", points: 0, totalSpent: 0 }];
    },
    setAll(data) {
      if (Array.isArray(data)) {
        localStorage.setItem("pos_customers", JSON.stringify(data));
      }
    }
  },

  settings: {
    get() {
      try {
        const data = localStorage.getItem("pos_settings");
        if (data) return JSON.parse(data);
      } catch(e) {}
      return { defaultTaxRate: 5.0, currency: "₹", storeName: "ApexPOS" };
    }
  },

  heldOrders: {
    getAll() {
      try { return JSON.parse(localStorage.getItem("pos_held_orders") || "[]"); } catch(e) { return []; }
    },
    getById(id) {
      return this.getAll().find(o => o.id === id);
    },
    add(order) {
      const orders = this.getAll();
      const newOrder = { ...order, id: "HOLD-" + Date.now() };
      orders.push(newOrder);
      localStorage.setItem("pos_held_orders", JSON.stringify(orders));
      return newOrder;
    },
    remove(id) {
      const orders = this.getAll().filter(o => o.id !== id);
      localStorage.setItem("pos_held_orders", JSON.stringify(orders));
    }
  },

  users: {
    getAll() {
      return [
        { id: "usr-1", name: "Alex Morgan", role: "admin", pin: "1234" },
        { id: "usr-2", name: "Sarah Connor", role: "cashier", pin: "0000" }
      ];
    }
  }
};
