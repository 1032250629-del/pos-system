/**
 * Store Settings & Configuration Controller
 * Handles store identity, tax rates, currency symbol, theme switching, and data factory resets.
 */

const Settings = {
  init() {
    this.bindEvents();
    this.loadSettings();
  },

  bindEvents() {
    const form = document.getElementById("settings-form");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.saveSettings();
      };
    }

    const resetBtn = document.getElementById("btn-factory-reset");
    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (confirm("WARNING: This will reset all products, customers, transactions, and settings back to initial demo seed data. Proceed?")) {
          await DB.resetToDefaults();
          App.toast("System Reset", "Demo data has been restored.", "info");
          setTimeout(() => location.reload(), 600);
        }
      };
    }

    const themeToggle = document.getElementById("setting-theme-toggle");
    if (themeToggle) {
      themeToggle.onchange = (e) => {
        const theme = e.target.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
        DB.settings.update({ theme });
      };
    }
  },

  loadSettings() {
    const settings = DB.settings.get();

    const nameInput = document.getElementById("setting-store-name");
    const taglineInput = document.getElementById("setting-store-tagline");
    const addressInput = document.getElementById("setting-store-address");
    const phoneInput = document.getElementById("setting-store-phone");
    const taxIdInput = document.getElementById("setting-tax-id");
    const currencyInput = document.getElementById("setting-currency");
    const taxRateInput = document.getElementById("setting-default-tax");
    const thresholdInput = document.getElementById("setting-low-stock-threshold");
    const footerInput = document.getElementById("setting-receipt-footer");
    const themeToggle = document.getElementById("setting-theme-toggle");

    if (nameInput) nameInput.value = settings.storeName || "";
    if (taglineInput) taglineInput.value = settings.storeTagline || "";
    if (addressInput) addressInput.value = settings.storeAddress || "";
    if (phoneInput) phoneInput.value = settings.storePhone || "";
    if (taxIdInput) taxIdInput.value = settings.taxId || "";
    if (currencyInput) currencyInput.value = settings.currency || "$";
    if (taxRateInput) taxRateInput.value = settings.defaultTaxRate !== undefined ? settings.defaultTaxRate : 8.5;
    if (thresholdInput) thresholdInput.value = settings.lowStockThreshold || 10;
    if (footerInput) footerInput.value = settings.receiptFooter || "";
    
    if (themeToggle) {
      themeToggle.checked = settings.theme === "dark";
      document.documentElement.setAttribute("data-theme", settings.theme || "light");
    }
  },

  async saveSettings() {
    if (!Auth.isAdmin()) {
      App.toast("Access Denied", "Only Store Managers/Admins can modify store configuration.", "danger");
      return;
    }

    const updated = {
      storeName: document.getElementById("setting-store-name").value.trim(),
      storeTagline: document.getElementById("setting-store-tagline").value.trim(),
      storeAddress: document.getElementById("setting-store-address").value.trim(),
      storePhone: document.getElementById("setting-store-phone").value.trim(),
      taxId: document.getElementById("setting-tax-id").value.trim(),
      currency: document.getElementById("setting-currency").value.trim(),
      defaultTaxRate: parseFloat(document.getElementById("setting-default-tax").value) || 0,
      lowStockThreshold: parseInt(document.getElementById("setting-low-stock-threshold").value) || 10,
      receiptFooter: document.getElementById("setting-receipt-footer").value.trim()
    };

    await DB.settings.update(updated);
    App.toast("Settings Saved", "Store configuration updated successfully.", "success");

    // Refresh affected views
    Pos.renderCatalog();
    Pos.renderCart(Cart.items, Cart.getSummary(), Cart.customer);
  }
};
