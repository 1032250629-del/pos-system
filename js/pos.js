/**
 * POS Billing Terminal Controller
 */

const Pos = {
  activeCategory: "all",
  searchQuery: "",

  init() {
    this.bindEvents();
    this.renderCategoryBar();
    this.renderCatalog();
    if (typeof Cart !== "undefined") {
      Cart.init();
    }
  },

  bindEvents() {
    const searchInput = document.getElementById("pos-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderCatalog();
      });
    }

    const clearBtn = document.getElementById("btn-clear-cart");
    if (clearBtn) {
      clearBtn.onclick = () => Cart.clear();
    }

    const barcodeBtn = document.getElementById("pos-barcode-btn");
    if (barcodeBtn) {
      barcodeBtn.onclick = () => {
        const products = DB.products.getAll();
        if (products.length > 0) {
          const randomItem = products[Math.floor(Math.random() * products.length)];
          Cart.addItem(randomItem);
        }
      };
    }
  },

  renderCategoryBar() {
    const container = document.getElementById("pos-category-bar");
    if (!container) return;

    let categories = DB.categories.getAll();

    let html = `
      <button class="category-chip ${this.activeCategory === 'all' ? 'active' : ''}" data-category="all">
        <span class="chip-icon">🏷️</span>
        <span>All Items</span>
      </button>
    `;

    categories.forEach(cat => {
      if (cat.id !== 'all') {
        html += `
          <button class="category-chip ${this.activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
            <span class="chip-icon">${cat.icon || '📦'}</span>
            <span>${cat.name}</span>
          </button>
        `;
      }
    });

    container.innerHTML = html;

    container.querySelectorAll(".category-chip").forEach(btn => {
      btn.onclick = () => {
        this.activeCategory = btn.dataset.category;
        this.renderCategoryBar();
        this.renderCatalog();
      };
    });
  },

  renderCatalog() {
    const grid = document.getElementById("pos-product-grid");
    if (!grid) return;

    let products = DB.products.getAll();

    if (this.activeCategory !== "all") {
      products = products.filter(p => p.category === this.activeCategory);
    }

    if (this.searchQuery) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.sku && p.sku.toLowerCase().includes(this.searchQuery))
      );
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="Pos.handleProductClick('${p.id}')" style="cursor: pointer;">
        <div class="product-card-top" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="product-icon" style="font-size: 1.8rem;">${p.icon || '📦'}</span>
          <span class="product-stock-badge" style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.05);">${p.stock} left</span>
        </div>
        <div class="product-card-title" style="font-weight: 600; margin-top: 8px;">${p.name}</div>
        <div class="product-card-price" style="font-weight: 700; color: var(--primary-600); margin-top: 4px;">₹${parseFloat(p.price).toFixed(2)}</div>
      </div>
    `).join("");
  },

  handleProductClick(productId) {
    const product = DB.products.getById(productId);
    if (product) {
      Cart.addItem(product);
    }
  },

  renderCartUI(items, summary) {
    const badgeCount = document.getElementById("cart-badge-count");
    if (badgeCount) badgeCount.textContent = summary.itemCount || 0;

    const subtotalEl = document.getElementById("pos-subtotal-val");
    if (subtotalEl) subtotalEl.textContent = `₹${summary.subtotal.toFixed(2)}`;

    const taxEl = document.getElementById("pos-tax-val");
    if (taxEl) taxEl.textContent = `₹${summary.tax.toFixed(2)}`;

    const discountEl = document.getElementById("pos-discount-val");
    if (discountEl) discountEl.textContent = `−₹${summary.discount.toFixed(2)}`;

    const grandTotalEl = document.getElementById("pos-grand-total-val");
    if (grandTotalEl) grandTotalEl.textContent = `₹${summary.grandTotal.toFixed(2)}`;

    const payBtn = document.getElementById("btn-proceed-pay");
    if (payBtn) payBtn.disabled = items.length === 0;

    const cartContainer = document.getElementById("pos-cart-items");
    if (!cartContainer) return;

    if (items.length === 0) {
      cartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🛒</div>
          <p>Cart is currently empty</p>
        </div>
      `;
      return;
    }

    cartContainer.innerHTML = items.map(item => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <span class="cart-item-title">${item.name}</span>
          <span class="cart-item-price">₹${item.price.toFixed(2)} each</span>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn" onclick="Cart.updateQuantity('${item.id}', ${item.qty - 1})">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="Cart.updateQuantity('${item.id}', ${item.qty + 1})">+</button>
          <span class="cart-item-total">₹${item.total.toFixed(2)}</span>
          <button class="btn-remove-item" onclick="Cart.removeItem('${item.id}')">✕</button>
        </div>
      </div>
    `).join("");
  }
};
