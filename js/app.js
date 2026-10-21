/**
 * App Shell, Router, Keyboard Shortcuts & Web Audio Sound Feedback
 * Integrates with Backend synchronization on initial launch.
 */

const App = {
  activeView: "pos",
  audioCtx: null,

  async init() {
    this.initClock();
    this.bindNavigation();
    this.bindShortcuts();
    this.bindModals();
    this.initRoleSwitchModal();

    // Initialize Database & Sync from Backend first
    await DB.init();

    // Initialize Subsystems
    Auth.init();
    Cart.init();
    Pos.init();
    Dashboard.init();
    Inventory.init();
    Transactions.init();
    Customers.init();
    Settings.init();

    // Navigate to initial view
    this.navigate("pos");
  },

  initClock() {
    const clockEl = document.getElementById("header-live-clock");
    const updateTime = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  bindNavigation() {
    const navButtons = document.querySelectorAll(".nav-item button");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetView = btn.dataset.view;
        if (targetView) {
          this.navigate(targetView);
        }
      });
    });
  },

  navigate(viewId) {
    // Check role permissions for restricted views
    if ((viewId === "settings") && !Auth.isAdmin()) {
      this.toast("Access Restricted", "Settings are only accessible by Store Managers/Admins.", "warning");
      return;
    }

    this.activeView = viewId;

    // Update active sidebar nav
    document.querySelectorAll(".nav-item").forEach(item => {
      const btn = item.querySelector("button");
      if (btn && btn.dataset.view === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update Top Header Title
    const titleMap = {
      pos: "POS Billing Terminal",
      dashboard: "Analytics & Store Dashboard",
      inventory: "Inventory & Stock Catalog",
      transactions: "Sales History & Orders",
      customers: "Customer Directory & CRM",
      settings: "System & Store Settings"
    };
    const titleEl = document.getElementById("header-page-title");
    if (titleEl) titleEl.textContent = titleMap[viewId] || "Point of Sale";

    // Show corresponding view container
    document.querySelectorAll(".view-container").forEach(view => {
      view.classList.add("hidden");
    });
    const targetEl = document.getElementById(`${viewId}-view`);
    if (targetEl) targetEl.classList.remove("hidden");

    // Refresh view specific data when navigating
    if (viewId === "dashboard") Dashboard.init();
    if (viewId === "inventory") Inventory.renderProductsTable();
    if (viewId === "transactions") Transactions.renderTransactionsTable();
    if (viewId === "customers") Customers.renderCustomersTable();
    if (viewId === "settings") Settings.loadSettings();
    if (viewId === "pos") {
      Pos.renderCategoryBar();
      Pos.renderCatalog();
      setTimeout(() => {
        const searchInput = document.getElementById("pos-search-input");
        if (searchInput) searchInput.focus();
      }, 100);
    }
  },

  bindShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Prevent browser default on POS Function Keys
      if (["F1", "F2", "F3", "F4", "F8", "F9"].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "F1") {
        this.navigate("pos");
        const search = document.getElementById("pos-search-input");
        if (search) {
          search.focus();
          search.select();
        }
      } else if (e.key === "F2") {
        const holdBtn = document.getElementById("btn-hold-bill");
        if (holdBtn) holdBtn.click();
      } else if (e.key === "F3") {
        Pos.openHeldOrdersModal();
      } else if (e.key === "F4") {
        Pos.openDiscountModal();
      } else if (e.key === "F8") {
        const payBtn = document.getElementById("btn-proceed-pay");
        if (payBtn && !payBtn.disabled) payBtn.click();
      } else if (e.key === "F9") {
        const clearBtn = document.getElementById("btn-clear-cart");
        if (clearBtn) clearBtn.click();
      } else if (e.key === "Escape") {
        this.closeAllModals();
      }
    });
  },

  bindModals() {
    // Backdrop click to dismiss
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          this.closeModal(backdrop);
        }
      });
    });

    // Close button clicks
    document.querySelectorAll(".btn-close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-backdrop");
        if (modal) this.closeModal(modal);
      });
    });
  },

  openModal(modalEl) {
    if (modalEl) modalEl.classList.add("active");
  },

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove("active");
  },

  closeAllModals() {
    document.querySelectorAll(".modal-backdrop.active").forEach(modal => {
      this.closeModal(modal);
    });
  },

  initRoleSwitchModal() {
    const triggerBtn = document.getElementById("btn-switch-user");
    const modal = document.getElementById("auth-modal");
    const userSelect = document.getElementById("auth-user-select");
    const pinInput = document.getElementById("auth-user-pin");
    const loginForm = document.getElementById("auth-modal-form");

    if (triggerBtn && modal) {
      triggerBtn.onclick = () => {
        const users = DB.users.getAll();
        userSelect.innerHTML = users.map(u => `
          <option value="${u.id}">${u.name} (${u.role.toUpperCase()})</option>
        `).join("");
        pinInput.value = "";
        this.openModal(modal);
      };
    }

    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const userId = userSelect.value;
        const pin = pinInput.value.trim();
        const res = await Auth.login(userId, pin);

        if (res.success) {
          this.toast("Login Successful", `Switched active user to ${res.user.name} (${res.user.role}).`, "success");
          this.closeModal(modal);
          this.navigate("pos");
        } else {
          this.toast("Authentication Failed", res.message, "danger");
          this.playBeep("error");
        }
      };
    }
  },

  /**
   * Sound synthesizer using Web Audio API
   */
  playBeep(type = "scan") {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === "scan") {
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.08);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, this.audioCtx.currentTime + 0.2); // C6
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  },

  /**
   * Global Toast Notification System
   */
  toast(title, message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: "✅",
      danger: "❌",
      warning: "⚠️",
      info: "ℹ️"
    };

    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || "ℹ️"}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }
};

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
