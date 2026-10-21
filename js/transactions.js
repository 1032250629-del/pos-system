/**
 * Transactions & Sales History Controller
 * Lists past orders, filters by date/payment mode/status, provides invoice details,
 * 1-click receipt reprint, and full/partial refund processing.
 */

const Transactions = {
  searchQuery: "",
  methodFilter: "all",
  statusFilter: "all",

  init() {
    this.bindEvents();
    this.renderTransactionsTable();
  },

  bindEvents() {
    const searchInput = document.getElementById("tx-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTransactionsTable();
      };
    }

    const methodSelect = document.getElementById("tx-method-filter");
    if (methodSelect) {
      methodSelect.onchange = (e) => {
        this.methodFilter = e.target.value;
        this.renderTransactionsTable();
      };
    }

    const statusSelect = document.getElementById("tx-status-filter");
    if (statusSelect) {
      statusSelect.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.renderTransactionsTable();
      };
    }
  },

  renderTransactionsTable() {
    const tbody = document.getElementById("transactions-table-body");
    if (!tbody) return;

    let orders = DB.orders.getAll();
    const settings = DB.settings.get();

    // Filters
    if (this.methodFilter !== "all") {
      orders = orders.filter(o => o.paymentMethod === this.methodFilter);
    }

    if (this.statusFilter !== "all") {
      orders = orders.filter(o => o.status === this.statusFilter);
    }

    if (this.searchQuery) {
      orders = orders.filter(o => 
        o.invoiceNumber.toLowerCase().includes(this.searchQuery) ||
        o.id.toLowerCase().includes(this.searchQuery) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(this.searchQuery)) ||
        (o.cashier && o.cashier.toLowerCase().includes(this.searchQuery))
      );
    }

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No transaction records found matching the filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const isCompleted = o.status === "completed";
      const statusBadge = isCompleted 
        ? `<span class="badge badge-success">Completed</span>` 
        : `<span class="badge badge-danger">Refunded</span>`;

      return `
        <tr>
          <td style="font-weight: 700; font-family: var(--font-mono);">${o.invoiceNumber}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">
            ${new Date(o.timestamp).toLocaleDateString()} ${new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </td>
          <td>${o.customer?.name || "Walk-in"}</td>
          <td>${o.cashier}</td>
          <td style="text-transform: uppercase; font-size: 0.8rem; font-weight: 600;">${o.paymentMethod}</td>
          <td style="font-weight: 800; font-family: var(--font-mono);">${settings.currency}${o.grandTotal.toFixed(2)}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-view-invoice" data-id="${o.id}">Invoice</button>
              ${isCompleted ? `<button class="btn btn-ghost btn-sm btn-refund-order" data-id="${o.id}" style="color: var(--danger-600);">Refund</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // View / Reprint Invoice
    tbody.querySelectorAll(".btn-view-invoice").forEach(b => {
      b.onclick = () => {
        const order = DB.orders.getById(b.dataset.id);
        if (order) Pos.showReceiptPreview(order);
      };
    });

    // Refund Order
    tbody.querySelectorAll(".btn-refund-order").forEach(b => {
      b.onclick = async () => {
        const reason = prompt("Enter reason for refunding this order:", "Customer dissatisfaction / Damaged goods");
        if (reason !== null) {
          const refunded = await DB.orders.refund(b.dataset.id, reason);
          if (refunded) {
            App.toast("Order Refunded", `Order #${refunded.invoiceNumber} has been marked refunded & items restocked.`, "info");
            this.renderTransactionsTable();
            Pos.renderCatalog();
            Dashboard.init();
          }
        }
      };
    });
  }
};
