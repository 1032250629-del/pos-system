/**
 * Inventory & Stock Management Controller
 * Handles product catalog table, search & filters, stock status indicators,
 * Add/Edit Product modal, and stock replenishment.
 */

const Inventory = {
  searchQuery: "",
  selectedCategory: "all",
  selectedStockFilter: "all",

  init() {
    this.bindEvents();
    this.renderCategoryOptions();
    this.renderProductsTable();
  },

  bindEvents() {
    const searchInput = document.getElementById("inv-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderProductsTable();
      };
    }

    const catSelect = document.getElementById("inv-category-filter");
    if (catSelect) {
      catSelect.onchange = (e) => {
        this.selectedCategory = e.target.value;
        this.renderProductsTable();
      };
    }

    const stockFilterSelect = document.getElementById("inv-stock-filter");
    if (stockFilterSelect) {
      stockFilterSelect.onchange = (e) => {
        this.selectedStockFilter = e.target.value;
        this.renderProductsTable();
      };
    }

    const addBtn = document.getElementById("btn-add-product");
    if (addBtn) {
      addBtn.onclick = () => {
        this.openProductModal(null);
      };
    }
  },

  renderCategoryOptions() {
    const filterSelect = document.getElementById("inv-category-filter");
    const modalSelect = document.getElementById("prod-modal-category");
    const categories = DB.categories.getAll();

    const optionsHtml = categories.map(c => `<option value="${c.id}">${c.icon || ""} ${c.name}</option>`).join("");
    if (filterSelect) filterSelect.innerHTML = optionsHtml;
    
    // Modal select excludes "all"
    const realCategories = categories.filter(c => c.id !== "all");
    if (modalSelect) {
      modalSelect.innerHTML = realCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    }
  },

  renderProductsTable() {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody) return;

    let products = DB.products.getAll();
    const settings = DB.settings.get();

    // Category filter
    if (this.selectedCategory && this.selectedCategory !== "all") {
      products = products.filter(p => p.category === this.selectedCategory);
    }

    // Stock status filter
    if (this.selectedStockFilter === "low") {
      products = products.filter(p => p.stock > 0 && p.stock <= (settings.lowStockThreshold || 10));
    } else if (this.selectedStockFilter === "out") {
      products = products.filter(p => p.stock <= 0);
    }

    // Search query
    if (this.searchQuery) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.sku && p.sku.toLowerCase().includes(this.searchQuery)) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery))
      );
    }

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No products match the filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const isOut = p.stock <= 0;
      const isLow = p.stock > 0 && p.stock <= (settings.lowStockThreshold || 10);
      let badge = `<span class="badge badge-success">In Stock</span>`;
      if (isOut) badge = `<span class="badge badge-danger">Out of Stock</span>`;
      else if (isLow) badge = `<span class="badge badge-warning">Low (${p.stock})</span>`;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="inventory-table-img">${p.icon || "📦"}</div>
              <div>
                <div style="font-weight: 700;">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                  SKU: ${p.sku || "N/A"} | Barcode: ${p.barcode || "N/A"}
                </div>
              </div>
            </div>
          </td>
          <td style="text-transform: capitalize;">${p.category}</td>
          <td style="font-weight: 700; font-family: var(--font-mono);">${settings.currency}${p.price.toFixed(2)}</td>
          <td style="color: var(--text-muted); font-family: var(--font-mono);">${settings.currency}${(p.costPrice || 0).toFixed(2)}</td>
          <td>
            <div class="stock-adjust-cell">
              <button class="btn btn-secondary btn-sm btn-stock-minus" data-id="${p.id}">−</button>
              <span class="stock-num">${p.stock}</span>
              <button class="btn btn-secondary btn-sm btn-stock-plus" data-id="${p.id}">+</button>
            </div>
          </td>
          <td>${badge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-edit-prod" data-id="${p.id}">Edit</button>
              <button class="btn btn-ghost btn-sm btn-del-prod admin-only" data-id="${p.id}" style="color: var(--danger-600);">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Stock +/- adjustments
    tbody.querySelectorAll(".btn-stock-minus").forEach(b => {
      b.onclick = async () => {
        await DB.products.updateStock(b.dataset.id, -1);
        this.renderProductsTable();
        Pos.renderCatalog();
      };
    });

    tbody.querySelectorAll(".btn-stock-plus").forEach(b => {
      b.onclick = async () => {
        await DB.products.updateStock(b.dataset.id, 1);
        this.renderProductsTable();
        Pos.renderCatalog();
      };
    });

    // Edit Product
    tbody.querySelectorAll(".btn-edit-prod").forEach(b => {
      b.onclick = () => {
        const prod = DB.products.getById(b.dataset.id);
        if (prod) this.openProductModal(prod);
      };
    });

    // Delete Product
    tbody.querySelectorAll(".btn-del-prod").forEach(b => {
      b.onclick = async () => {
        if (!Auth.isAdmin()) {
          App.toast("Access Denied", "Only Store Managers/Admins can delete products.", "danger");
          return;
        }
        if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
          await DB.products.delete(b.dataset.id);
          App.toast("Product Deleted", "Item removed from inventory.", "info");
          this.renderProductsTable();
          Pos.renderCatalog();
        }
      };
    });
  },

  openProductModal(product = null) {
    const modal = document.getElementById("product-modal");
    const titleEl = document.getElementById("product-modal-title");
    const form = document.getElementById("product-modal-form");

    titleEl.textContent = product ? "Edit Product" : "Add New Product";
    form.reset();

    const idInput = document.getElementById("prod-modal-id");
    const nameInput = document.getElementById("prod-modal-name");
    const skuInput = document.getElementById("prod-modal-sku");
    const barcodeInput = document.getElementById("prod-modal-barcode");
    const catInput = document.getElementById("prod-modal-category");
    const priceInput = document.getElementById("prod-modal-price");
    const costInput = document.getElementById("prod-modal-cost");
    const taxInput = document.getElementById("prod-modal-tax");
    const stockInput = document.getElementById("prod-modal-stock");
    const iconInput = document.getElementById("prod-modal-icon");

    if (product) {
      idInput.value = product.id;
      nameInput.value = product.name;
      skuInput.value = product.sku || "";
      barcodeInput.value = product.barcode || "";
      catInput.value = product.category || "beverages";
      priceInput.value = product.price;
      costInput.value = product.costPrice || "";
      taxInput.value = product.taxRate !== undefined ? product.taxRate : 8.5;
      stockInput.value = product.stock;
      iconInput.value = product.icon || "📦";
    } else {
      idInput.value = "";
      taxInput.value = DB.settings.get().defaultTaxRate || 8.5;
      iconInput.value = "🛍️";
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const newProdData = {
        id: idInput.value || undefined,
        name: nameInput.value.trim(),
        sku: skuInput.value.trim().toUpperCase() || "SKU-" + Math.floor(Math.random() * 10000),
        barcode: barcodeInput.value.trim() || String(Math.floor(1000000000 + Math.random() * 9000000000)),
        category: catInput.value,
        price: parseFloat(priceInput.value) || 0,
        costPrice: parseFloat(costInput.value) || 0,
        taxRate: parseFloat(taxInput.value) || 0,
        stock: parseInt(stockInput.value) || 0,
        icon: iconInput.value.trim() || "📦"
      };

      await DB.products.save(newProdData);
      App.toast("Product Saved", `${newProdData.name} updated successfully.`, "success");
      App.closeModal(modal);
      this.renderProductsTable();
      Pos.renderCatalog();
    };

    App.openModal(modal);
  }
};
