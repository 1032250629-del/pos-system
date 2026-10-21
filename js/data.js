/**
 * Data Storage & API Sync Layer
 * Connects directly to Render Express/SQLite backend
 */

const DB = {
  isOnline: false,
  baseUrl: "/api",

  async init() {
    await this.checkHealth();
    await this.syncFromBackend();
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
            statusPill.innerHTML = `
              <span class="status-dot"></span>
              <span>Backend: SQLite Live</span>
            `;
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Backend connection check failed, using local fallback:", err);
    }

    this.isOnline = false;
    if (statusPill) {
      statusPill.className = "server-status-pill offline";
      statusPill.innerHTML = `
        <span class="status-dot"></span>
        <span>Backend: Offline (Cache)</span>
      `;
    }
  },

  async syncFromBackend() {
    if (!this.isOnline) return;
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        fetch(`${this.baseUrl}/products`),
        fetch(`${this.baseUrl}/categories`),
        fetch(`${this.baseUrl}/customers`)
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.products) this.products.setAll(prodData.products);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.categories) this.categories.setAll(catData.categories);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        if (custData.customers) this.customers.setAll(custData.customers);
      }
    } catch (err) {
      console.error("Error syncing backend data:", err);
    }
  },

  products: {
    getAll() {
      return JSON.parse(localStorage.getItem("pos_products") || "[]");
    },
    setAll(data) {
      localStorage.setItem("pos_products", JSON.stringify(data));
    }
  },

  categories: {
    getAll() {
      return JSON.parse(localStorage.getItem("pos_categories") || "[]");
    },
    setAll(data) {
      localStorage.setItem("pos_categories", JSON.stringify(data));
    }
  },

  customers: {
    getAll() {
      return JSON.parse(localStorage.getItem("pos_customers") || "[]");
    },
    setAll(data) {
      localStorage.setItem("pos_customers", JSON.stringify(data));
    }
  },

  users: {
    getAll() {
      return JSON.parse(localStorage.getItem("pos_users") || "[]");
    }
  }
};
