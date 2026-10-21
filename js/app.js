/**
 * Main App Controller & Interactive Modal Engine
 */

const App = {
  activeView: "pos",

  async init() {
    this.initClock();
    this.bindNavigation();
    this.bindCartButtons();

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

  bindCartButtons() {
    // Pay / Checkout Modal
    const payBtn = document.getElementById("btn-proceed-pay");
    if (payBtn) {
      payBtn.onclick = () => {
        if (Cart.items.length === 0) return;
        this.openPaymentModal();
      };
    }

    // Customer Selection Modal
    const custBtn = document.getElementById("btn-select-customer");
    if (custBtn) {
      custBtn.onclick = () => {
        this.openCustomerModal();
      };
    }

    // Discount Modal
    const discountBtn = document.getElementById("btn-apply-discount");
    if (discountBtn) {
      discountBtn.onclick = () => {
        const val = prompt("Enter Discount Percentage (%):", Cart.discountValue || "10");
        if (val !== null) {
          Cart.discountValue = Math.max(0, parseFloat(val) || 0);
          Cart.notify();
        }
      };
    }
  },

  openPaymentModal() {
    const summary = Cart.getSummary();
    const existing = document.getElementById("custom-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-modal-overlay";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
      z-index: 99999; backdrop-filter: blur(3px);
    `;

    overlay.innerHTML = `
      <div style="background: #FFF; width: 420px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <h3 style="margin: 0; font-size: 1.2rem; color: #111827;">💳 Complete Payment</h3>
          <button id="close-modal-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>
        
        <div style="margin: 20px 0; text-align: center; background: #F3F4F6; padding: 16px; border-radius: 8px;">
          <span style="font-size: 0.9rem; color: #6B7280; display: block;">Total Amount Due</span>
          <span style="font-size: 2.2rem; font-weight: 800; color: #10B981;">₹${summary.grandTotal.toFixed(2)}</span>
        </div>

        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Select Payment Method:</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <button class="pay-method-btn active" data-method="Cash" style="padding: 12px; border: 2px solid #4F46E5; background: #EEF2FF; border-radius: 8px; font-weight: 700; cursor: pointer; color: #4F46E5;">💵 Cash</button>
          <button class="pay-method-btn" data-method="UPI" style="padding: 12px; border: 1px solid #D1D5DB; background: #FFF; border-radius: 8px; font-weight: 700; cursor: pointer; color: #374151;">📱 UPI / QR</button>
          <button class="pay-method-btn" data-method="Card" style="padding: 12px; border: 1px solid #D1D5DB; background: #FFF; border-radius: 8px; font-weight: 700; cursor: pointer; color: #374151;">💳 Credit Card</button>
          <button class="pay-method-btn" data-method="Split" style="padding: 12px; border: 1px solid #D1D5DB; background: #FFF; border-radius: 8px; font-weight: 700; cursor: pointer; color: #374151;">🔄 Split Pay</button>
        </div>

        <button id="confirm-pay-btn" style="width: 100%; height: 48px; background: #10B981; color: #FFF; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 700; cursor: pointer;">
          Confirm Payment & Print Receipt
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    let selectedMethod = "Cash";
    overlay.querySelectorAll(".pay-method-btn").forEach(btn => {
      btn.onclick = () => {
        overlay.querySelectorAll(".pay-method-btn").forEach(b => {
          b.style.border = "1px solid #D1D5DB";
          b.style.background = "#FFF";
          b.style.color = "#374151";
        });
        btn.style.border = "2px solid #4F46E5";
        btn.style.background = "#EEF2FF";
        btn.style.color = "#4F46E5";
        selectedMethod = btn.dataset.method;
      };
    });

    document.getElementById("close-modal-btn").onclick = () => overlay.remove();

    document.getElementById("confirm-pay-btn").onclick = () => {
      const txn = Cart.checkout(selectedMethod);
      overlay.remove();
      this.playBeep("success");
      alert(`✅ Transaction Complete!\n\nReceipt #${txn.id}\nCustomer: ${txn.customer.name}\nAmount: ₹${txn.summary.grandTotal.toFixed(2)}\nMethod: ${selectedMethod}`);
      if (this.activeView === "customers") this.renderCustomerHistory();
    };
  },

  openCustomerModal() {
    const customers = [
      { id: "cust-0", name: "Walk-in Customer", points: 0, phone: "N/A" },
      { id: "cust-1", name: "Rahul Sharma", points: 240, phone: "+91 98112 34567" },
      { id: "cust-2", name: "Priya Patel", points: 580, phone: "+91 98223 45678" },
      { id: "cust-3", name: "Ananya Roy", points: 120, phone: "+91 98334 56789" }
    ];

    const existing = document.getElementById("custom-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-modal-overlay";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
      z-index: 99999; backdrop-filter: blur(3px);
    `;

    overlay.innerHTML = `
      <div style="background: #FFF; width: 400px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.2rem; color: #111827;">👤 Select Customer</h3>
          <button id="close-cust-modal" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${customers.map(c => `
            <div class="cust-option-card" data-id="${c.id}" style="padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; hover: background: #F9FAFB;">
              <div>
                <div style="font-weight: 700; color: #111827;">${c.name}</div>
                <div style="font-size: 0.8rem; color: #6B7280;">${c.phone}</div>
              </div>
              <span style="font-size: 0.75rem; background: #EEF2FF; color: #4F46E5; padding: 4px 8px; border-radius: 12px; font-weight: 700;">${c.points} pts</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("close-cust-modal").onclick = () => overlay.remove();

    overlay.querySelectorAll(".cust-option-card").forEach(card => {
      card.onclick = () => {
        const custId = card.dataset.id;
        const selected = customers.find(c => c.id === custId);
        if (selected) {
          Cart.setCustomer(selected);
        }
        overlay.remove();
      };
    });
  },

  playBeep(type = "scan") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "scan") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {}
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
        <div style="padding: 40px; text-align: center; color: #6B7280;">
          <h2>Customer CRM & Order History</h2>
          <p style="margin-top: 10px;">No transaction history recorded yet. Complete a transaction in the Billing Terminal to view customer sales here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="padding: 24px; max-width: 1100px; margin: 0 auto;">
        <h2 style="margin-bottom: 20px; color: #111827;">Customer Order & Payment History</h2>
        <table style="width: 100%; border-collapse: collapse; background: #FFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background: #F9FAFB; text-align: left; border-bottom: 1px solid #E5E7EB; color: #4B5563; font-size: 0.85rem; text-transform: uppercase;">
              <th style="padding: 14px 16px;">Receipt ID</th>
              <th style="padding: 14px 16px;">Customer</th>
              <th style="padding: 14px 16px;">Date & Time</th>
              <th style="padding: 14px 16px;">Method</th>
              <th style="padding: 14px 16px; text-align: right;">Total Paid</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(t => `
              <tr style="border-bottom: 1px solid #F3F4F6;">
                <td style="padding: 14px 16px; font-weight: 700; color: #4F46E5;">${t.id}</td>
                <td style="padding: 14px 16px; font-weight: 600;">${t.customer ? t.customer.name : 'Walk-in Customer'}</td>
                <td style="padding: 14px 16px; color: #6B7280;">${new Date(t.date).toLocaleString()}</td>
                <td style="padding: 14px 16px;"><span style="background: #F3F4F6; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 0.82rem;">${t.paymentMethod}</span></td>
                <td style="padding: 14px 16px; text-align: right; font-weight: 800; color: #10B981; font-size: 1.05rem;">₹${t.summary.grandTotal.toFixed(2)}</td>
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
