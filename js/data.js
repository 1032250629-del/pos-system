/**
 * Data Storage & API Sync Layer
 * Handles live SQLite server persistence with local storage fallback
 */

const DB = {
  isOnline: false,
  baseUrl: "/api",

  async init() {
    await this.checkHealth();
    await this.syncFromBackend();
  },

  async checkHealth() {
    const badge = document.getElementById("backend-status-badge") || document.querySelector(".status-badge");
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "online") {
          this.isOnline = true;
          if (badge) {
            badge.textContent = "Backend: SQLite Live";
            badge.className = "badge bg-success";
            badge.style.backgroundColor = "#28a745";
            badge.style.color = "#ffffff";
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Backend unavailable, using local cache:", err);
    }

    this.isOnline = false;
    if (badge) {
      badge.textContent = "Backend: Offline (Cache)";
      badge.className = "badge bg-warning";
      badge.style.backgroundColor = "#ffc107";
      badge.style.color = "#000000";
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
