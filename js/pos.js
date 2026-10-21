/**
 * POS Catalog & Billing Terminal Module
 */

const Pos = {
  activeCategory: "all",
  searchQuery: "",

  init() {
    this.bindEvents();
    this.renderCategoryBar();
    this.renderCatalog();
  },

  bindEvents() {
    const searchInput = document.getElementById("pos-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderCatalog();
      });
    }

    const scrollLeft = document.getElementById("cat-scroll-left");
    const scrollRight = document.getElementById("cat-scroll-right");
    const categoryBar = document.getElementById("pos-category-bar");

    if (scrollLeft && categoryBar) {
      scrollLeft.onclick = () => categoryBar.scrollBy({ left: -200, behavior: "smooth" });
    }
    if (scrollRight && categoryBar) {
      scrollRight.onclick = () => categoryBar.scrollBy({ left: 200, behavior: "smooth" });
    }

    const barcodeBtn = document.getElementById("pos-barcode-btn");
    if (barcodeBtn) {
      barcodeBtn.onclick = () => {
        const products = DB.products.getAll();
        if (products.length > 0) {
          const randomItem = products[Math.floor(Math.random() * products.length)];
          Cart.addItem(randomItem.id);
          if (typeof App !== 'undefined') App.playBeep("scan");
        }
      };
    }
  },

  renderCategoryBar() {
    const container = document.getElementById("pos-category-bar");
    if (!container) return;

    let categories = DB.categories.getAll();
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = [
        { id: "all", name: "All Items", icon: "🏷️" },
        { id: "beverages", name: "Beverages", icon: "☕" },
        { id: "bakery", name: "Bakery & Sweets", icon: "🥐" },
        { id: "snacks", name: "Snacks & Food", icon: "🍔" }
      ];
    }

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
        (p.sku && p.sku.toLowerCase().includes(this.searchQuery)) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery))
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
          <p>No products found matching filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="Cart.addItem('${p.id}')" style="cursor: pointer;">
        <div class="product-card-top" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="product-icon" style="font-size: 1.8rem;">${p.icon || '📦'}</span>
          <span class="product-stock-badge ${p.stock <= 5 ? 'low-stock' : ''}" style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.05);">${p.stock} left</span>
        </div>
        <div class="product-card-title" style="font-weight: 600; margin-top: 8px;">${p.name}</div>
        <div class="product-card-price" style="font-weight: 700; color: var(--primary-600); margin-top: 4px;">₹${parseFloat(p.price).toFixed(2)}</div>
      </div>
    `).join("");
  },

  openHeldOrdersModal() {
    if (typeof PosModal !== 'undefined' && PosModal.openHeld) {
      PosModal.openHeld();
    }
  },

  openDiscountModal() {
    if (typeof PosModal !== 'undefined' && PosModal.openDiscount) {
      PosModal.openDiscount();
    }
  }
};
