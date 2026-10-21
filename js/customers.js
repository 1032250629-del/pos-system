/**
 * Customers & Loyalty CRM Controller
 * Handles customer listing, adding/editing customers, and viewing loyalty points.
 */

const Customers = {
  searchQuery: "",

  init() {
    this.bindEvents();
    this.renderCustomersTable();
  },

  bindEvents() {
    const searchInput = document.getElementById("cust-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCustomersTable();
      };
    }

    const addBtn = document.getElementById("btn-add-customer");
    if (addBtn) {
      addBtn.onclick = () => {
        this.openCustomerModal(null);
      };
    }
  },

  renderCustomersTable() {
    const tbody = document.getElementById("customers-table-body");
    if (!tbody) return;

    let customers = DB.customers.getAll();
    const settings = DB.settings.get();

    if (this.searchQuery) {
      customers = customers.filter(c => 
        c.name.toLowerCase().includes(this.searchQuery) ||
        (c.phone && c.phone.includes(this.searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(this.searchQuery))
      );
    }

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No customer records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td style="font-weight: 700;">${c.name}</td>
        <td>${c.phone || "N/A"}</td>
        <td style="color: var(--text-muted);">${c.email || "N/A"}</td>
        <td>
          <span class="badge badge-warning" style="font-size: 0.85rem; font-weight: 700;">
            ⭐ ${c.points || 0} pts
          </span>
        </td>
        <td style="font-weight: 700; font-family: var(--font-mono);">${settings.currency}${(c.totalSpent || 0).toFixed(2)}</td>
        <td>
          ${c.id !== "cust-0" ? `
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm btn-edit-cust" data-id="${c.id}">Edit</button>
            </div>
          ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Default Walk-in</span>'}
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-cust").forEach(b => {
      b.onclick = () => {
        const cust = DB.customers.getById(b.dataset.id);
        if (cust) this.openCustomerModal(cust);
      };
    });
  },

  openCustomerModal(customer = null) {
    const modal = document.getElementById("customer-edit-modal");
    const titleEl = document.getElementById("cust-modal-title");
    const form = document.getElementById("cust-modal-form");

    titleEl.textContent = customer ? "Edit Customer" : "Add New Customer";
    form.reset();

    const idInput = document.getElementById("cust-modal-id");
    const nameInput = document.getElementById("cust-modal-name");
    const phoneInput = document.getElementById("cust-modal-phone");
    const emailInput = document.getElementById("cust-modal-email");
    const pointsInput = document.getElementById("cust-modal-points");

    if (customer) {
      idInput.value = customer.id;
      nameInput.value = customer.name;
      phoneInput.value = customer.phone || "";
      emailInput.value = customer.email || "";
      pointsInput.value = customer.points || 0;
    } else {
      idInput.value = "";
      pointsInput.value = 0;
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const customerData = {
        id: idInput.value || undefined,
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        points: parseInt(pointsInput.value) || 0
      };

      await DB.customers.save(customerData);
      App.toast("Customer Saved", `${customerData.name} record saved.`, "success");
      App.closeModal(modal);
      this.renderCustomersTable();
    };

    App.openModal(modal);
  }
};
