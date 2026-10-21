/**
 * Reactive Shopping Cart Engine
 * Manages active cart items, quantity adjustments, tax calculations, discounts,
 * hold/resume order states, and customer assignments in Indian Rupees (₹).
 */

const Cart = {
  items: [],
  customer: null,
  discountType: "percent", // "percent" or "fixed"
  discountValue: 0,
  appliedPointsDiscount: 0,
  listeners: [],

  init() {
    const customers = (typeof DB !== "undefined" && DB.customers) ? DB.customers.getAll() : [];
    this.customer = customers[0] || { id: "cust-0", name: "Walk-in Customer", points: 0 };
    this.notify();
  },

  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  },

  notify(lastUpdatedId = null) {
    const summary = this.getSummary();
    this.listeners.forEach(cb => {
      if (typeof cb === "function") {
        cb(this.items, summary, this.customer, lastUpdatedId);
      }
    });
  },

  setCustomer(customer) {
    this.customer = customer;
    this.notify();
  },

  addItem(product, qty = 1) {
    if (!product || product.stock <= 0) {
      if (typeof App !== "undefined") {
        App.toast("Out of Stock", `${product?.name || "Item"} is currently out of stock.`, "danger");
        App.playBeep("error");
      }
      return false;
    }

    const existingIndex = this.items.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      const existing = this.items[existingIndex];
      const newQty = existing.qty + qty;
      if (newQty > product.stock) {
        if (typeof App !== "undefined") {
          App.toast("Stock Limit Exceeded", `Only ${product.stock} units available in stock.`, "warning");
          App.playBeep("error");
        }
        return false;
      }
      existing.qty = newQty;
      existing.total = Number((existing.qty * existing.price).toFixed(2));
      if (typeof App !== "undefined") {
        App.playBeep("scan");
        App.toast("Cart Updated", `Increased ${product.name} quantity to ${existing.qty}.`, "info", 2000);
      }
      this.notify(product.id);
      return product.id;
    } else {
      if (qty > product.stock) {
        if (typeof App !== "undefined") {
          App.toast("Stock Limit Exceeded", `Only ${product.stock} units available.`, "warning");
          App.playBeep("error");
        }
        return false;
      }
      this.items.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        taxRate: product.taxRate !== undefined ? product.taxRate : 5.0,
        stock: product.stock,
        icon: product.icon || "📦",
        qty: qty,
        total: Number((qty * product.price).toFixed(2))
      });
      if (typeof App !== "undefined") {
        App.playBeep("scan");
        App.toast("Added to Cart", `${product.name} added to cart.`, "success", 2000);
      }
      this.notify(product.id);
      return product.id;
    }
  },

  updateQuantity(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;

    if (isNaN(qty) || qty <= 0) {
      this.removeItem(productId);
      return;
    }

    let maxStock = item.stock;
    if (typeof DB !== "undefined" && DB.products && typeof DB.products.getById === "function") {
      const liveProduct = DB.products.getById(productId);
      if (liveProduct) maxStock = liveProduct.stock;
    }

    if (qty > maxStock) {
      if (typeof App !== "undefined") {
        App.toast("Stock Limit Hit", `Maximum available stock is ${maxStock} units.`, "warning");
        App.playBeep("error");
      }
      qty = maxStock;
    }

    item.qty = qty;
    item.total = Number((item.qty * item.price).toFixed(2));
    this.notify(productId);
  },

  removeItem(productId) {
    const item = this.items.find(i => i.id === productId);
    const name = item ? item.name : "Item";
    this.items = this.items.filter(i => i.id !== productId);
    if (typeof App !== "undefined") {
      App.toast("Item Removed", `${name} was removed from cart.`, "info", 2000);
    }
    this.notify();
  },

  clear() {
    this.items = [];
    this.discountType = "percent";
    this.discountValue = 0;
    this.appliedPointsDiscount = 0;
    const customers = (typeof DB !== "undefined" && DB.customers) ? DB.customers.getAll() : [];
    this.customer = customers[0] || { id: "cust-0", name: "Walk-in Customer", points: 0 };
    this.notify();
  },

  applyDiscount(type, value) {
    this.discountType = type;
    this.discountValue = Math.max(0, Number(value) || 0);
    this.notify();
  },

  getSummary() {
    // Safe settings extraction to prevent undefined crashes
    const settings = (typeof DB !== "undefined" && DB.settings && typeof DB.settings.get === "function")
      ? DB.settings.get()
      : { defaultTaxRate: 5.0, currency: "₹" };

    let subtotal = 0;
    let totalTax = 0;
    let totalItemCount = 0;

    this.items.forEach(item => {
      const lineSubtotal = item.price * item.qty;
      const rate = item.taxRate !== undefined ? item.taxRate : (settings.defaultTaxRate || 5.0);
      const lineTax = lineSubtotal * (rate / 100);

      subtotal += lineSubtotal;
      totalTax += lineTax;
      totalItemCount += item.qty;
    });

    // Compute bill discount
    let billDiscount = 0;
    if (this.discountType === "percent") {
      billDiscount = (subtotal * (this.discountValue / 100));
    } else {
      billDiscount = this.discountValue;
    }

    const totalDiscount = Math.min(subtotal, billDiscount + this.appliedPointsDiscount);
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    
    // Scale tax proportionally if discount applied
    const adjustedTax = subtotal > 0 ? (totalTax * (taxableAmount / subtotal)) : 0;
    const grandTotal = Math.max(0, taxableAmount + adjustedTax);

    return {
      itemCount: totalItemCount,
      uniqueItemCount: this.items.length,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(adjustedTax.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      currency: settings.currency || "₹"
    };
  },

  holdCurrentBill(note = "") {
    if (this.items.length === 0) {
      if (typeof App !== "undefined") {
        App.toast("Cart Empty", "Please add items before holding a bill.", "warning");
      }
      return null;
    }

    const summary = this.getSummary();
    if (typeof DB !== "undefined" && DB.heldOrders && typeof DB.heldOrders.add === "function") {
      const held = DB.heldOrders.add({
        items: JSON.parse(JSON.stringify(this.items)),
        customer: this.customer,
        discountType: this.discountType,
        discountValue: this.discountValue,
        summary,
        note: note || `Held bill for ${this.customer.name}`
      });

      this.clear();
      if (typeof App !== "undefined") {
        App.toast("Bill Held", `Bill #${held.id} parked successfully.`, "info");
      }
      return held;
    }
    return null;
  },

  resumeHeldBill(heldId) {
    if (typeof DB === "undefined" || !DB.heldOrders || typeof DB.heldOrders.getById !== "function") return false;
    const held = DB.heldOrders.getById(heldId);
    if (!held) return false;

    if (this.items.length > 0) {
      if (!confirm("Discard active cart items to resume this parked bill?")) {
        return false;
      }
    }

    this.items = JSON.parse(JSON.stringify(held.items));
    this.customer = held.customer || { id: "cust-0", name: "Walk-in Customer", points: 0 };
    this.discountType = held.discountType || "percent";
    this.discountValue = held.discountValue || 0;

    if (typeof DB.heldOrders.remove === "function") {
      DB.heldOrders.remove(heldId);
    }
    this.notify();
    if (typeof App !== "undefined") {
      App.toast("Bill Resumed", `Parked bill restored to cart.`, "success");
    }
    return true;
  }
};
