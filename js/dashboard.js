/**
 * Dashboard & Analytics Controller
 * Calculates KPIs, renders Chart.js charts (Sales Trend, Category Distribution),
 * and lists recent transactions & top-selling products.
 * Powered by Express /api/dashboard/stats with local offline fallback.
 */

const Dashboard = {
  salesChartInstance: null,
  categoryChartInstance: null,
  serverStats: null,

  async init() {
    await this.fetchServerStats();
    this.renderKPIs();
    this.renderCharts();
    this.renderTopProducts();
    this.renderRecentTransactions();
  },

  async fetchServerStats() {
    try {
      const res = await DB.api('/dashboard/stats');
      if (res && res.success) {
        this.serverStats = res;
      }
    } catch (e) {
      this.serverStats = null;
    }
  },

  renderKPIs() {
    const settings = DB.settings.get();
    let todayRevenue = 0;
    let totalOrdersCount = 0;
    let avgOrderValue = 0;
    let lowStockCount = 0;

    if (this.serverStats && this.serverStats.kpis) {
      const k = this.serverStats.kpis;
      todayRevenue = k.todayRevenue;
      totalOrdersCount = k.totalOrdersCount;
      avgOrderValue = k.avgOrderValue;
      lowStockCount = k.lowStockCount;
    } else {
      const orders = DB.orders.getAll();
      const products = DB.products.getAll();
      const todayStr = new Date().toISOString().split("T")[0];
      const todayOrders = orders.filter(o => o.timestamp && o.timestamp.startsWith(todayStr) && o.status === "completed");

      todayRevenue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      totalOrdersCount = orders.filter(o => o.status === "completed").length;
      avgOrderValue = todayOrders.length > 0 ? (todayRevenue / todayOrders.length) : 0;
      lowStockCount = products.filter(p => p.stock <= (settings.lowStockThreshold || 10)).length;
    }

    const revEl = document.getElementById("kpi-today-revenue");
    const countEl = document.getElementById("kpi-total-orders");
    const aovEl = document.getElementById("kpi-avg-order-value");
    const lowStockEl = document.getElementById("kpi-low-stock-count");

    if (revEl) revEl.textContent = `${settings.currency || "₹"}${todayRevenue.toFixed(2)}`;
    if (countEl) countEl.textContent = totalOrdersCount;
    if (aovEl) aovEl.textContent = `${settings.currency || "₹"}${avgOrderValue.toFixed(2)}`;
    if (lowStockEl) {
      lowStockEl.textContent = lowStockCount;
      if (lowStockCount > 0) {
        lowStockEl.style.color = "var(--danger-600)";
      } else {
        lowStockEl.style.color = "";
      }
    }
  },

  renderCharts() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js is not loaded");
      return;
    }

    const settings = DB.settings.get();

    // --- 1. Hourly/Weekly Sales Trend Chart ---
    const salesCanvas = document.getElementById("dashboard-sales-chart");
    if (salesCanvas) {
      if (this.salesChartInstance) {
        this.salesChartInstance.destroy();
      }

      let days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      let salesByDay = [120, 190, 240, 310, 420, 580, 490];

      if (this.serverStats && this.serverStats.charts && this.serverStats.charts.weeklySales) {
        days = this.serverStats.charts.weeklySales.labels;
        salesByDay = this.serverStats.charts.weeklySales.data;
      } else {
        const orders = DB.orders.getAll().filter(o => o.status === "completed");
        const todayDayIdx = (new Date().getDay() + 6) % 7;
        const todayLiveTotal = orders.reduce((acc, o) => acc + o.grandTotal, 0);
        salesByDay[todayDayIdx] = Math.max(salesByDay[todayDayIdx], todayLiveTotal);
      }

      this.salesChartInstance = new Chart(salesCanvas, {
        type: "line",
        data: {
          labels: days,
          datasets: [{
            label: `Revenue (${settings.currency || "₹"})`,
            data: salesByDay,
            borderColor: "#6366F1",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: "#4F46E5",
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0, 0, 0, 0.05)" }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // --- 2. Category Share Doughnut Chart ---
    const catCanvas = document.getElementById("dashboard-category-chart");
    if (catCanvas) {
      if (this.categoryChartInstance) {
        this.categoryChartInstance.destroy();
      }

      let categoryTotals = {};
      if (this.serverStats && this.serverStats.charts && this.serverStats.charts.categoryShare) {
        categoryTotals = this.serverStats.charts.categoryShare;
      } else {
        const orders = DB.orders.getAll().filter(o => o.status === "completed");
        orders.forEach(order => {
          if (order.items) {
            order.items.forEach(item => {
              const prod = DB.products.getById(item.id);
              const cat = prod ? prod.category : "other";
              categoryTotals[cat] = (categoryTotals[cat] || 0) + item.total;
            });
          }
        });
      }

      const catLabels = Object.keys(categoryTotals).map(c => c.toUpperCase());
      const catData = Object.values(categoryTotals);

      const finalLabels = catLabels.length ? catLabels : ["BEVERAGES", "BAKERY", "SNACKS", "PRODUCE"];
      const finalData = catData.length ? catData : [45, 25, 20, 10];

      this.categoryChartInstance = new Chart(catCanvas, {
        type: "doughnut",
        data: {
          labels: finalLabels,
          datasets: [{
            data: finalData,
            backgroundColor: ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" }
          },
          cutout: "68%"
        }
      });
    }
  },

  renderTopProducts() {
    const container = document.getElementById("dashboard-top-products-list");
    if (!container) return;

    const settings = DB.settings.get();
    let topList = [];

    if (this.serverStats && this.serverStats.topProducts && this.serverStats.topProducts.length > 0) {
      topList = this.serverStats.topProducts;
    } else {
      const orders = DB.orders.getAll().filter(o => o.status === "completed");
      const itemMap = {};
      orders.forEach(o => {
        if (o.items) {
          o.items.forEach(it => {
            if (!itemMap[it.id]) {
              itemMap[it.id] = { name: it.name, count: 0, revenue: 0 };
            }
            itemMap[it.id].count += it.qty;
            itemMap[it.id].revenue += it.total || (it.price * it.qty);
          });
        }
      });
      topList = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);
    }

    if (topList.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No sales recorded yet.</p>`;
      return;
    }

    container.innerHTML = topList.map((p, idx) => `
      <div class="widget-item-row">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 800; color: var(--text-light); width: 16px;">#${idx + 1}</span>
          <div>
            <div style="font-weight: 600;">${p.name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${p.count} units sold</div>
          </div>
        </div>
        <span style="font-weight: 700; font-family: var(--font-mono);">${settings.currency || "₹"}${p.revenue.toFixed(2)}</span>
      </div>
    `).join("");
  },

  renderRecentTransactions() {
    const container = document.getElementById("dashboard-recent-orders-list");
    if (!container) return;

    const settings = DB.settings.get();
    let orders = [];

    if (this.serverStats && this.serverStats.recentTransactions && this.serverStats.recentTransactions.length > 0) {
      orders = this.serverStats.recentTransactions;
    } else {
      orders = DB.orders.getAll().slice(0, 5);
    }

    if (orders.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No recent transactions.</p>`;
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="widget-item-row">
        <div>
          <div style="font-weight: 700;">${o.invoiceNumber}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            ${new Date(o.timestamp).toLocaleTimeString()} • ${o.customer?.name || "Walk-in"} • ${(o.paymentMethod || "cash").toUpperCase()}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-family: var(--font-mono);">${settings.currency || "₹"}${o.grandTotal.toFixed(2)}</div>
          <span class="badge ${o.status === "completed" ? "badge-success" : "badge-danger"}">${o.status}</span>
        </div>
      </div>
    `).join("");
  }
};
