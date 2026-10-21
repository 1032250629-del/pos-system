/**
 * POS Billing Terminal Controller
 * Product catalog browsing, live search & exact barcode enter, category scrolling,
 * pop/flash animations, reactive cart UI, payment modal in ₹, and receipt printing.
 */

const Pos = {
  activeCategory: "all",
  searchQuery: "",

  init() {
    this.bindEvents();
    this.renderCategories();
    this.renderCatalog();
    this.updateHeldCount();

    // Subscribe to cart changes to re-render cart UI
    Cart.subscribe((items, summary, customer, lastUpdatedId) => {
      this.renderCart(items, summary, customer, lastUpdatedId);
    });
  },

  bindEvents() {
    // 1. Live Search Input
    const searchInput = document.getElementById("pos-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCatalog();
      });

      // Quick barcode / SKU Enter
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const query = this.searchQuery;
          if (!query) return;

          // Try exact barcode/SKU first
          let matchedProduct = DB.products.getByBarcodeOrSku(query);
          
          // If no barcode match, try exact name or single visible product
          if (!matchedProduct) {
            const allProducts = DB.products.getAll();
            matchedProduct = allProducts.find(p => p.name.toLowerCase() === query);
          }

          if (matchedProduct) {
            if (matchedProduct.stock <= 0) {
              App.toast("Out of Stock", `${matchedProduct.name} is out of stock.`, "danger");
              App.playBeep("error");
            } else {
              Cart.addItem(matchedProduct, 1);
              searchInput.value = "";
              this.searchQuery = "";
              this.renderCatalog();
            }
          } else {
            // If only 1 product matches filter, add it
            const filtered = DB.products.getAll().filter(p => 
              p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query))
            );
            if (filtered.length === 1) {
              const single = filtered[0];
              if (single.stock > 0) {
                Cart.addItem(single, 1);
                searchInput.value = "";
                this.searchQuery = "";
                this.renderCatalog();
              } else {
                App.toast("Out of Stock", `${single.name} is out of stock.`, "danger");
                App.playBeep("error");
              }
            } else {
              App.toast("Product Not Found", `No match for: "${query}"`, "warning", 2000);
              App.playBeep("error");
            }
          }
        }
      });
    }

    // 2. Barcode scanner simulator button
    const barcodeBtn = document.getElementById("pos-barcode-btn");
    if (barcodeBtn) {
      barcodeBtn.addEventListener("click", () => {
        const barcode = prompt("Scan or Enter Barcode / SKU (e.g. 8901001001 or BEV-001):");
        if (barcode) {
          const prod = DB.products.getByBarcodeOrSku(barcode);
          if (prod) {
            Cart.addItem(prod, 1);
          } else {
            App.toast("Barcode Not Found", `No product matches barcode: ${barcode}`, "warning");
            App.playBeep("error");
          }
        }
      });
    }

    // 3. Category Horizontal Scroll Arrows & Drag
    const catBar = document.getElementById("pos-category-bar");
    const arrowLeft = document.getElementById("cat-scroll-left");
    const arrowRight = document.getElementById("cat-scroll-right");

    if (arrowLeft && catBar) {
      arrowLeft.onclick = () => {
        catBar.scrollBy({ left: -160, behavior: "smooth" });
      };
    }

    if (arrowRight && catBar) {
      arrowRight.onclick = () => {
        catBar.scrollBy({ left: 160, behavior: "smooth" });
      };
    }

    // Enable drag scroll on category bar
    if (catBar) {
      let isDown = false;
      let startX;
      let scrollLeft;

      catBar.addEventListener("mousedown", (e) => {
        isDown = true;
        startX = e.pageX - catBar.offsetLeft;
        scrollLeft = catBar.scrollLeft;
      });
      catBar.addEventListener("mouseleave", () => { isDown = false; });
      catBar.addEventListener("mouseup", () => { isDown = false; });
      catBar.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - catBar.offsetLeft;
        const walk = (x - startX) * 1.5;
        catBar.scrollLeft = scrollLeft - walk;
      });
    }

    // 4. Action buttons
    const clearBtn = document.getElementById("btn-clear-cart");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (Cart.items.length === 0) return;
        if (confirm("Are you sure you want to clear all items in the active cart?")) {
          Cart.clear();
        }
      });
    }

    const holdBtn = document.getElementById("btn-hold-bill");
    if (holdBtn) {
      holdBtn.addEventListener("click", () => {
        if (Cart.items.length === 0) {
          App.toast("Cart Empty", "Please add items before holding a bill.", "warning");
          return;
        }
        const note = prompt("Enter a note or identifier for this held bill (Optional):", `Bill for ${Cart.customer.name}`);
        if (note !== null) {
          Cart.holdCurrentBill(note);
          this.updateHeldCount();
        }
      });
    }

    const viewHeldBtn = document.getElementById("btn-view-held");
    if (viewHeldBtn) {
      viewHeldBtn.addEventListener("click", () => {
        this.openHeldOrdersModal();
      });
    }

    const discountBtn = document.getElementById("btn-apply-discount");
    if (discountBtn) {
      discountBtn.addEventListener("click", () => {
        this.openDiscountModal();
      });
    }

    const customerBtn = document.getElementById("btn-select-customer");
    if (customerBtn) {
      customerBtn.addEventListener("click", () => {
        this.openCustomerSelectorModal();
      });
    }

    const payBtn = document.getElementById("btn-proceed-pay");
    if (payBtn) {
      payBtn.addEventListener("click", () => {
        if (Cart.items.length === 0) {
          App.toast("Empty Cart", "Add at least one item to proceed to payment.", "warning");
          App.playBeep("error");
          return;
        }
        this.openPaymentModal();
      });
    }
  },

  renderCategories() {
    const container = document.getElementById("pos-category-bar");
    if (!container) return;

    const categories = DB.categories.getAll();
    container.innerHTML = categories.map(cat => `
      <button class="category-chip ${cat.id === this.activeCategory ? "active" : ""}" data-category="${cat.id}">
        <span>${cat.icon || "🏷️"}</span>
        <span>${cat.name}</span>
      </button>
    `).join("");

    container.querySelectorAll(".category-chip").forEach(chip => {
      chip.addEventListener("click", (e) => {
        const catId = e.currentTarget.dataset.category;
        this.activeCategory = catId;
        this.renderCategories();
        this.renderCatalog();
      });
    });
  },

  renderCatalog() {
    const grid = document.getElementById("pos-product-grid");
    if (!grid) return;

    let products = DB.products.getByCategory(this.activeCategory);
    const settings = DB.settings.get();

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
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
          <h3 style="color: var(--text-main);">No matching products found</h3>
          <p style="font-size: 0.85rem; margin-top: 4px;">Try searching with a different keyword or category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(prod => {
      const isOutOfStock = prod.stock <= 0;
      const isLowStock = prod.stock > 0 && prod.stock <= (settings.lowStockThreshold || 10);
      let stockBadge = `<span class="product-stock-tag stock-in">${prod.stock} in stock</span>`;
      
      if (isOutOfStock) {
        stockBadge = `<span class="product-stock-tag stock-out">Out of Stock</span>`;
      } else if (isLowStock) {
        stockBadge = `<span class="product-stock-tag stock-low">Low: ${prod.stock} left</span>`;
      }

      return `
        <div class="product-card ${isOutOfStock ? "out-of-stock" : ""}" data-id="${prod.id}">
          <div class="product-card-img-wrap">
            <span>${prod.icon || "📦"}</span>
            ${stockBadge}
          </div>
          <div class="product-info">
            <span class="product-sku">${prod.sku || "SKU-N/A"}</span>
            <div class="product-name" title="${prod.name}">${prod.name}</div>
          </div>
          <div class="product-card-footer">
            <span class="product-price">${settings.currency}${prod.price.toFixed(2)}</span>
            <button class="product-add-btn" aria-label="Add to cart" ${isOutOfStock ? "disabled" : ""}>+</button>
          </div>
        </div>
      `;
    }).join("");

    // Add click listeners to product cards with pop animation
    grid.querySelectorAll(".product-card").forEach(card => {
      card.addEventListener("click", () => {
        const prodId = card.dataset.id;
        const prod = DB.products.getById(prodId);
        if (!prod) return;

        if (prod.stock <= 0) {
          App.toast("Out of Stock", `${prod.name} is currently out of stock.`, "danger");
          App.playBeep("error");
          return;
        }

        // Trigger pop animation on card
        card.classList.remove("card-pop-anim");
        void card.offsetWidth; // Force reflow
        card.classList.add("card-pop-anim");

        Cart.addItem(prod, 1);
      });
    });
  },

  renderCart(items, summary, customer, lastUpdatedId = null) {
    const listContainer = document.getElementById("pos-cart-items");
    const countBadge = document.getElementById("cart-badge-count");
    const customerNameEl = document.getElementById("cart-customer-name");
    const customerPtsEl = document.getElementById("cart-customer-points");
    const payBtn = document.getElementById("btn-proceed-pay");

    // Enable/disable checkout button
    if (payBtn) {
      if (items.length > 0) {
        payBtn.removeAttribute("disabled");
      } else {
        payBtn.setAttribute("disabled", "true");
      }
    }

    // Update Header Counts
    if (countBadge) countBadge.textContent = summary.itemCount;
    if (customerNameEl) customerNameEl.textContent = customer?.name || "Walk-in Customer";
    if (customerPtsEl) {
      if (customer && customer.id !== "cust-0") {
        customerPtsEl.textContent = `${customer.points || 0} pts`;
        customerPtsEl.parentElement.classList.remove("hidden");
      } else {
        customerPtsEl.parentElement.classList.add("hidden");
      }
    }

    // Render Items
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">🛒</div>
          <h4 style="color: var(--text-main); font-weight: 700;">Cart is empty</h4>
          <p style="font-size: 0.85rem;">Click any product card or scan a barcode to start billing.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = items.map(item => {
        const isFlash = lastUpdatedId && item.id === lastUpdatedId;
        return `
          <div class="cart-item ${isFlash ? "item-flash-anim" : ""}" data-id="${item.id}">
            <div class="cart-item-main">
              <div>
                <div class="cart-item-title">${item.icon} ${item.name}</div>
                <div class="cart-item-unit-price">${summary.currency}${item.price.toFixed(2)} each ${item.taxRate ? `(${item.taxRate}% GST)` : ""}</div>
              </div>
              <div class="cart-item-total">${summary.currency}${item.total.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
              <div class="qty-stepper">
                <button class="qty-btn btn-qty-minus" data-id="${item.id}">−</button>
                <input type="number" class="qty-input" value="${item.qty}" min="1" max="${item.stock}" data-id="${item.id}">
                <button class="qty-btn btn-qty-plus" data-id="${item.id}">+</button>
              </div>
              <div class="cart-item-actions">
                <button class="btn btn-ghost btn-sm btn-delete-item" data-id="${item.id}" style="color: var(--danger-600);">
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      // Bind item row controls
      listContainer.querySelectorAll(".btn-qty-minus").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const item = Cart.items.find(i => i.id === id);
          if (item) Cart.updateQuantity(id, item.qty - 1);
        });
      });

      listContainer.querySelectorAll(".btn-qty-plus").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const item = Cart.items.find(i => i.id === id);
          if (item) Cart.updateQuantity(id, item.qty + 1);
        });
      });

      listContainer.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("change", (e) => {
          const id = input.dataset.id;
          const val = parseInt(e.target.value) || 1;
          Cart.updateQuantity(id, val);
        });
      });

      listContainer.querySelectorAll(".btn-delete-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          Cart.removeItem(id);
        });
      });
    }

    // Update Summary Footers with live number animation
    const subtotalEl = document.getElementById("pos-subtotal-val");
    const taxEl = document.getElementById("pos-tax-val");
    const discountEl = document.getElementById("pos-discount-val");
    const grandTotalEl = document.getElementById("pos-grand-total-val");

    if (subtotalEl) subtotalEl.textContent = `${summary.currency}${summary.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `${summary.currency}${summary.tax.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `−${summary.currency}${summary.discount.toFixed(2)}`;
    
    if (grandTotalEl) {
      grandTotalEl.textContent = `${summary.currency}${summary.grandTotal.toFixed(2)}`;
      grandTotalEl.classList.remove("pulse-anim");
      void grandTotalEl.offsetWidth;
      grandTotalEl.classList.add("pulse-anim");
    }
  },

  updateHeldCount() {
    const badge = document.getElementById("held-bills-count-badge");
    const heldList = DB.heldOrders.getAll();
    if (badge) {
      badge.textContent = heldList.length;
      if (heldList.length > 0) {
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  },

  openHeldOrdersModal() {
    const modal = document.getElementById("held-orders-modal");
    const listContainer = document.getElementById("held-orders-list");
    const heldList = DB.heldOrders.getAll();
    const settings = DB.settings.get();

    if (heldList.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No held/parked orders right now.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = heldList.map(h => `
        <div class="widget-item-row" style="padding: 12px 0;">
          <div>
            <div style="font-weight: 700;">${h.note || "Parked Bill"}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              ${new Date(h.timestamp).toLocaleTimeString()} • ${h.items.length} items • Total: ${settings.currency}${h.summary.grandTotal.toFixed(2)}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm btn-resume-held" data-id="${h.id}">Resume</button>
            <button class="btn btn-ghost btn-sm btn-discard-held" data-id="${h.id}" style="color: var(--danger-600);">Discard</button>
          </div>
        </div>
      `).join("");

      listContainer.querySelectorAll(".btn-resume-held").forEach(btn => {
        btn.addEventListener("click", () => {
          if (Cart.resumeHeldBill(btn.dataset.id)) {
            this.updateHeldCount();
            App.closeModal(modal);
          }
        });
      });

      listContainer.querySelectorAll(".btn-discard-held").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("Discard this parked bill?")) {
            await DB.heldOrders.remove(btn.dataset.id);
            this.updateHeldCount();
            this.openHeldOrdersModal();
          }
        });
      });
    }

    App.openModal(modal);
  },

  openDiscountModal() {
    const modal = document.getElementById("discount-modal");
    const inputVal = document.getElementById("discount-input-val");
    const typeSelect = document.getElementById("discount-type-select");
    const applyBtn = document.getElementById("btn-confirm-discount");

    if (typeSelect) typeSelect.value = Cart.discountType;
    if (inputVal) inputVal.value = Cart.discountValue || "";

    applyBtn.onclick = () => {
      const val = parseFloat(inputVal.value) || 0;
      const type = typeSelect.value;
      Cart.applyDiscount(type, val);
      const symbol = type === "percent" ? "%" : DB.settings.get().currency;
      App.toast("Discount Applied", `Applied ${val}${symbol} discount to the bill.`, "success");
      App.closeModal(modal);
    };

    App.openModal(modal);
  },

  openCustomerSelectorModal() {
    const modal = document.getElementById("customer-modal");
    const listContainer = document.getElementById("customer-list-container");
    const searchInput = document.getElementById("customer-modal-search");
    const customers = DB.customers.getAll();

    const renderCustList = (filter = "") => {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(filter.toLowerCase()) || 
        c.phone.includes(filter)
      );

      listContainer.innerHTML = filtered.map(c => `
        <div class="widget-item-row" style="cursor: pointer; padding: 10px; border-radius: var(--radius-md);" data-id="${c.id}">
          <div>
            <div style="font-weight: 700;">${c.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${c.phone} • ${c.points || 0} Reward Points</div>
          </div>
          <button class="btn btn-secondary btn-sm">Select</button>
        </div>
      `).join("");

      listContainer.querySelectorAll(".widget-item-row").forEach(row => {
        row.addEventListener("click", () => {
          const cust = DB.customers.getById(row.dataset.id);
          if (cust) {
            Cart.setCustomer(cust);
            App.toast("Customer Assigned", `Assigned ${cust.name} to transaction.`, "info");
            App.closeModal(modal);
          }
        });
      });
    };

    renderCustList();

    if (searchInput) {
      searchInput.value = "";
      searchInput.oninput = (e) => renderCustList(e.target.value);
    }

    App.openModal(modal);
  },

  openPaymentModal() {
    const modal = document.getElementById("payment-modal");
    const summary = Cart.getSummary();
    const settings = DB.settings.get();

    const totalEl = document.getElementById("pay-modal-total");
    const tenderedInput = document.getElementById("pay-tendered-amount");
    const changeDueEl = document.getElementById("pay-change-due");
    const presetsContainer = document.getElementById("pay-cash-presets");
    const confirmBtn = document.getElementById("btn-complete-payment");

    if (totalEl) totalEl.textContent = `${settings.currency}${summary.grandTotal.toFixed(2)}`;
    if (tenderedInput) {
      tenderedInput.value = Math.ceil(summary.grandTotal);
      setTimeout(() => tenderedInput.focus(), 100);
    }

    let activeMethod = "cash";
    const methodTabs = document.querySelectorAll(".payment-method-tab");
    methodTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.method === "cash");
      tab.onclick = () => {
        methodTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        activeMethod = tab.dataset.method;
        document.querySelectorAll(".payment-method-content").forEach(c => c.classList.add("hidden"));
        const targetView = document.getElementById(`pay-method-${activeMethod}`);
        if (targetView) targetView.classList.remove("hidden");
      };
    });

    // Update live change due calculator
    const updateChange = () => {
      const tendered = parseFloat(tenderedInput.value) || 0;
      const change = tendered - summary.grandTotal;
      if (changeDueEl) {
        if (change >= 0) {
          changeDueEl.textContent = `${settings.currency}${change.toFixed(2)}`;
          changeDueEl.style.color = "var(--success-700)";
        } else {
          changeDueEl.textContent = `Short by ${settings.currency}${Math.abs(change).toFixed(2)}`;
          changeDueEl.style.color = "var(--danger-600)";
        }
      }
    };

    tenderedInput.oninput = updateChange;
    updateChange();

    // Generate ₹ Cash Presets (Exact, ₹100, ₹200, ₹500, ₹1000, ₹2000)
    const exact = summary.grandTotal;
    const presets = [
      Math.ceil(exact),
      Math.ceil(exact / 50) * 50 || 50,
      Math.ceil(exact / 100) * 100 || 100,
      Math.ceil(exact / 500) * 500 || 500,
      2000
    ].filter((v, i, a) => a.indexOf(v) === i && v >= exact).slice(0, 4);

    if (presetsContainer) {
      presetsContainer.innerHTML = `
        <button class="preset-chip" data-amt="${exact}">Exact (${settings.currency}${exact.toFixed(2)})</button>
        ${presets.map(amt => `<button class="preset-chip" data-amt="${amt}">${settings.currency}${amt}</button>`).join("")}
      `;

      presetsContainer.querySelectorAll(".preset-chip").forEach(chip => {
        chip.onclick = () => {
          tenderedInput.value = parseFloat(chip.dataset.amt);
          updateChange();
        };
      });
    }

    confirmBtn.onclick = async () => {
      const tendered = parseFloat(tenderedInput.value) || 0;
      if (activeMethod === "cash" && tendered < summary.grandTotal) {
        App.toast("Insufficient Tendered Amount", `Tendered amount must be at least ${settings.currency}${summary.grandTotal.toFixed(2)}`, "danger");
        App.playBeep("error");
        return;
      }

      const changeDue = activeMethod === "cash" ? Math.max(0, tendered - summary.grandTotal) : 0;
      const currentUser = Auth.getCurrentUser();

      // Create completed order
      const completedOrder = await DB.orders.create({
        cashier: currentUser ? currentUser.name : "Alex Morgan",
        customer: Cart.customer,
        items: JSON.parse(JSON.stringify(Cart.items)),
        subtotal: summary.subtotal,
        tax: summary.tax,
        discount: summary.discount,
        grandTotal: summary.grandTotal,
        paymentMethod: activeMethod,
        tenderedAmount: activeMethod === "cash" ? tendered : summary.grandTotal,
        changeDue: Number(changeDue.toFixed(2))
      });

      App.playBeep("success");
      App.toast("Payment Successful!", `Order #${completedOrder.invoiceNumber} completed.`, "success");
      App.closeModal(modal);

      // Clear cart
      Cart.clear();
      this.renderCatalog();

      // Open Receipt Modal
      this.showReceiptPreview(completedOrder);
    };

    App.openModal(modal);
  },

  showReceiptPreview(order) {
    const modal = document.getElementById("receipt-modal");
    const container = document.getElementById("receipt-preview-content");
    const settings = DB.settings.get();

    container.innerHTML = `
      <div class="receipt-paper" id="printable-receipt">
        <div class="receipt-header">
          <div class="receipt-store-name">${settings.storeName}</div>
          <div class="receipt-store-sub">${settings.storeTagline}</div>
          <div class="receipt-store-sub">${settings.storeAddress}</div>
          <div class="receipt-store-sub">Tel: ${settings.storePhone} | GSTIN: ${settings.taxId}</div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-meta-row">
          <span>Invoice: <strong>${order.invoiceNumber}</strong></span>
          <span>Date: ${new Date(order.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="receipt-meta-row">
          <span>Cashier: ${order.cashier}</span>
          <span>Time: ${new Date(order.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="receipt-meta-row">
          <span>Customer: ${order.customer?.name || "Walk-in"}</span>
          <span>Payment: ${order.paymentMethod.toUpperCase()}</span>
        </div>

        <div class="receipt-double-divider"></div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(it => `
              <tr>
                <td>${it.name}</td>
                <td class="text-right">${it.qty}</td>
                <td class="text-right">${settings.currency}${it.price.toFixed(2)}</td>
                <td class="text-right">${settings.currency}${it.total.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="receipt-divider"></div>

        <div class="receipt-totals-row">
          <span>Subtotal:</span>
          <span>${settings.currency}${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="receipt-totals-row">
          <span>GST Tax:</span>
          <span>${settings.currency}${order.tax.toFixed(2)}</span>
        </div>
        ${order.discount > 0 ? `
          <div class="receipt-totals-row">
            <span>Discount:</span>
            <span>−${settings.currency}${order.discount.toFixed(2)}</span>
          </div>
        ` : ""}

        <div class="receipt-double-divider"></div>

        <div class="receipt-grand-total">
          <span>GRAND TOTAL:</span>
          <span>${settings.currency}${order.grandTotal.toFixed(2)}</span>
        </div>

        <div class="receipt-totals-row">
          <span>Tendered:</span>
          <span>${settings.currency}${order.tenderedAmount.toFixed(2)}</span>
        </div>
        <div class="receipt-totals-row">
          <span>Change Due:</span>
          <span>${settings.currency}${order.changeDue.toFixed(2)}</span>
        </div>

        <div class="receipt-barcode-wrap">
          <div class="receipt-barcode-lines"></div>
          <div style="font-size: 9px; margin-top: 2px;">* ${order.invoiceNumber} *</div>
        </div>

        <div class="receipt-footer">
          <p>${settings.receiptFooter}</p>
          <p style="margin-top: 4px; font-weight: 700;">*** THANK YOU - VISIT AGAIN ***</p>
        </div>
      </div>
    `;

    document.getElementById("btn-print-receipt").onclick = () => {
      window.print();
    };

    App.openModal(modal);
  }
};
