/**
 * POS Catalog & Billing Module
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
  },

  renderCategoryBar() {
    const container = document.getElementById("pos-category-bar");
    if (!container) return;

    let categories = DB.categories.getAll();
    if (!categories || categories.length === 0) {
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

    // Fallback to default demo items if local cache is fresh
    if (!products || products.length === 0) {
      products = [
        { id: "p1", name: "Artisan Cappuccino", price: 220, stock: 45, category: "beverages", icon: "☕", sku: "BEV-001" },
        { id: "p2", name: "Cold Brew Coffee", price: 250, stock: 30, category: "beverages", icon: "🥤", sku: "BEV-002" },
        { id: "p3", name: "Butter Croissant", price: 140, stock: 20, category: "bakery", icon: "🥐", sku: "BAK-001" },
        { id: "p4", name: "Blueberry Muffin", price: 160, stock: 15, category: "bakery", icon: "🧁", sku: "BAK-002" },
        { id: "p5", name: "Avocado Sourdough Toast", price: 320, stock: 12, category: "snacks", icon: "🥑", sku: "SNK-001" },
        { id: "p6", name: "Club Sandwich", price: 280, stock: 18, category: "snacks", icon: "🥪", sku: "SNK-002" }
      ];
      DB.products.setAll(products);
    }

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

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
          <p>No products found matching filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="Cart.addItem('${p.id}')">
        <div class="product-card-top">
          <span class="product-icon">${p.icon || '📦'}</span>
          <span class="product-stock-badge ${p.stock <= 5 ? 'low-stock' : ''}">${p.stock} left</span>
        </div>
        <div class="product-card-title">${p.name}</div>
        <div class="product-card-price">₹${parseFloat(p.price).toFixed(2)}</div>
      </div>
    `).join("");
  }
};
