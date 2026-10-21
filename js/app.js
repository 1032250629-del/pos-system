/**
 * App Controller
 */

const App = {
  activeView: "pos",

  async init() {
    this.initClock();
    this.bindNavigation();
    this.bindCheckout();

    await DB.init();

    if (typeof Auth !== "undefined") Auth.init();
    if (typeof Cart !== "undefined") Cart.init();
    if (typeof Pos !== "undefined") Pos.init();
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
        if (targetView) this.navigate(targetView);
      });
    });
  },

  navigate(viewId) {
    this.activeView = viewId;
    document.querySelectorAll(".nav-item").forEach(item => {
      const btn = item.querySelector("button");
      if (btn && btn.dataset.view === viewId) item.classList.add("active");
      else item.classList.remove("active");
    });

    document.querySelectorAll(".view-container").forEach(view => view.classList.add("hidden"));
    const targetEl = document.getElementById(`${viewId}-view`);
    if (targetEl) targetEl.classList.remove("hidden");

    if (viewId === "customers") this.renderCustomerHistory();
  },

  bindCheckout() {
    const payBtn = document.getElementById("btn-proceed-pay");
    if (payBtn) {
      payBtn.onclick = () => {
        if (Cart.items.length === 0) return;
        const method = prompt("Select Payment Method (Cash / Card / UPI):", "Cash");
        if (method) {
          const txn = Cart.checkout(method);
          alert(`Payment Successful!\nTransaction ID: ${txn.id}\nAmount Paid: ₹${txn.summary.grandTotal.toFixed(2)}`);
        }
      };
    }
  },

  renderCustomerHistory() {
    const container = document.getElementById("customers-view");
    if (!container) return;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("pos_transactions") || "[]");
    } catch(e) {}

    if (history.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #6B7280;">
          <h2>Customer CRM & Order History</h2>
          <p style="margin-top: 10px;">No transaction history found yet. Complete a checkout in Billing Terminal to view orders here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="padding: 20px;">
        <h2 style="margin-bottom: 16px;">Customer Transaction History</h2>
        <table style="width: 100%; border-collapse: collapse; background: #FFF; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #F9FAFB; text-align: left; border-bottom: 1px solid #E5E7EB;">
              <th style="padding: 12px;">Txn ID</th>
              <th style="padding: 12px;">Customer</th>
              <th style="padding: 12px;">Date</th>
              <th style="padding: 12px;">Method</th>
              <th style="padding: 12px; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(t => `
              <tr style="border-bottom: 1px solid #F3F4F6;">
                <td style="padding: 12px; font-weight: 600;">${t.id}</td>
                <td style="padding: 12px;">${t.customer ? t.customer.name : 'Walk-in Customer'}</td>
                <td style="padding: 12px;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 12px;">${t.paymentMethod}</td>
                <td style="padding: 12px; text-align: right; font-weight: 700; color: #10B981;">₹${t.summary.grandTotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
