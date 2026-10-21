/**
 * Reactive Shopping Cart Engine
 */

const Cart = {
  items: [],
  customer: { id: "cust-0", name: "Walk-in Customer", points: 0 },
  discountType: "percent",
  discountValue: 0,
  listeners: [],

  init() {
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
    if (typeof Pos !== "undefined" && typeof Pos.renderCartUI === "function") {
      Pos.renderCartUI(this.items, summary);
    }
  },

  addItem(product, qty = 1) {
    if (!product) return false;

    const existingIndex = this.items.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      const existing = this.items[existingIndex];
      existing.qty += qty;
      existing.total = Number((existing.qty * existing.price).toFixed(2));
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        qty: qty,
        total: Number((qty * product.price).toFixed(2))
      });
    }

    if (typeof App !== "undefined" && typeof App.playBeep === "function") {
      App.playBeep("scan");
    }
    this.notify(product.id);
    return product.id;
  },

  updateQuantity(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;

    if (isNaN(qty) || qty <= 0) {
      this.removeItem(productId);
      return;
    }

    item.qty = Number(qty);
    item.total = Number((item.qty * item.price).toFixed(2));
    this.notify(productId);
  },

  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.notify();
  },

  clear() {
    this.items = [];
    this.discountType = "percent";
    this.discountValue = 0;
    this.notify();
  },

  getSummary() {
    let subtotal = 0;
    let totalItemCount = 0;

    this.items.forEach(item => {
      subtotal += item.price * item.qty;
      totalItemCount += item.qty;
    });

    let discountAmount = 0;
    if (this.discountType === "percent") {
      discountAmount = subtotal * (this.discountValue / 100);
    } else {
      discountAmount = this.discountValue;
    }

    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = taxable * 0.05; // 5% GST
    const grandTotal = taxable + tax;

    return {
      itemCount: totalItemCount,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }
};
