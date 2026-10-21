/**
 * Reactive Shopping Cart Subsystem
 */

const Cart = {
  items: [],
  customer: { id: "cust-0", name: "Walk-in Customer", points: 120, phone: "+91 98765 43210" },
  discountType: "percent",
  discountValue: 0,

  init() {
    this.notify();
  },

  notify(lastUpdatedId = null) {
    const summary = this.getSummary();
    if (typeof Pos !== "undefined" && typeof Pos.renderCartUI === "function") {
      Pos.renderCartUI(this.items, summary);
    }
  },

  setCustomer(cust) {
    this.customer = cust;
    const nameEl = document.getElementById("cart-customer-name");
    if (nameEl) nameEl.textContent = cust.name;
    this.notify();
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
  },

  checkout(paymentMethod = "Cash") {
    if (this.items.length === 0) return false;

    const summary = this.getSummary();
    const transaction = {
      id: "TXN-" + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      customer: this.customer,
      items: JSON.parse(JSON.stringify(this.items)),
      summary: summary,
      paymentMethod: paymentMethod
    };

    try {
      const history = JSON.parse(localStorage.getItem("pos_transactions") || "[]");
      history.unshift(transaction);
      localStorage.setItem("pos_transactions", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save transaction", e);
    }

    this.clear();
    return transaction;
  }
};
