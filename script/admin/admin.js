// /script/admin.js
// Dépendances globales: apiUrl, getToken()

let ordersChart = null;

export async function init() {
  // 1) attacher tabs + garder onglet
  initTabs();

  // 2) s'assurer que Chart.js est dispo (car <script> dans innerHTML ne s'exécute pas)
  await ensureChartJs();

  //3) employé
  bindEmployeesRefresh();
  await loadEmployees();

  // 4) bind forms stats + reset 
  bindStatsOrders();
  bindStatsRevenue();
  bindResets();

  // 5) remplir select menus (si endpoint dispo)
  await preloadMenusForSelect();

  // 6) charger stats par défaut quand on arrive
  await loadOrdersPerMenu({});
  await loadRevenue({});
}

/* ---------------- TABS ---------------- */

function initTabs() {
  const tabs = document.querySelectorAll("#adminTabs [data-tab]");
  const panelEmployees = document.getElementById("tab-employees");
  const panelStats = document.getElementById("tab-stats");

  // restore
  const saved = sessionStorage.getItem("adminTab") || "employees";
  applyTab(saved);

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      applyTab(tab);
    });
  });

  function applyTab(tab) {
    tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    panelEmployees?.classList.toggle("d-none", tab !== "employees");
    panelStats?.classList.toggle("d-none", tab !== "stats");
    sessionStorage.setItem("adminTab", tab);
  }
}

/* ---------------- CHART.JS LOADER ---------------- */

async function ensureChartJs() {
  if (window.Chart) return;

  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Impossible de charger Chart.js"));
    document.head.appendChild(s);
  });
}

/* ---------------- STATS: ORDERS PER MENU ---------------- */

function bindStatsOrders() {
  const form = document.getElementById("form-stats-orders");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔒 empêche reload

    const fd = new FormData(form);
    const from = fd.get("from");
    const to = fd.get("to");

    await loadOrdersPerMenu({ from, to });
  });
}

async function loadOrdersPerMenu({ from, to }) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  const label = document.getElementById("orders-period-label");
  if (label) label.textContent = `Période: ${from || "…"} → ${to || "…"}`;

  const res = await fetch(`${apiUrl}admin/stats/orders-per-menu?${qs.toString()}`, {
    headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
  });

  const rows = await res.json().catch(() => []);
  const items = Array.isArray(rows) ? rows : [];

  renderOrdersChart(items);

  // update résumé commandes
  const totalOrders = items.reduce((sum, r) => sum + Number(r.ordersCount || 0), 0);
  const totalOrdersEl = document.getElementById("stats-total-orders");
  if (totalOrdersEl) totalOrdersEl.textContent = String(totalOrders);

  const hint = document.getElementById("orders-empty-hint");
  if (hint) hint.textContent = items.length ? "" : "Aucune donnée à afficher (essayez une autre période).";
}

function renderOrdersChart(rows) {
  const canvas = document.getElementById("chart-orders-per-menu");
  if (!canvas) return;

  const labels = rows.map((r) => r.menuTitre ?? `Menu #${r.menuId}`);
  const values = rows.map((r) => Number(r.ordersCount || 0));

  if (ordersChart) ordersChart.destroy();

  ordersChart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Commandes", data: values }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

/* ---------------- STATS: REVENUE ---------------- */

function bindStatsRevenue() {
  const form = document.getElementById("form-stats-revenue");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔒 empêche reload

    const fd = new FormData(form);
    const menuId = fd.get("menuId");
    const from = fd.get("from");
    const to = fd.get("to");

    await loadRevenue({ menuId, from, to });
  });
}

async function loadRevenue({ menuId, from, to }) {
  const qs = new URLSearchParams();
  if (menuId) qs.set("menuId", menuId);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  const label = document.getElementById("revenue-period-label");
  if (label) label.textContent = `Période: ${from || "…"} → ${to || "…"}`;

  const out = document.getElementById("revenue-result");
  const tbody = document.getElementById("revenue-tbody");
  const totalRevenueEl = document.getElementById("stats-total-revenue");

  if (out) out.textContent = "Calcul en cours...";
  if (tbody) tbody.innerHTML = "";

  const res = await fetch(`${apiUrl}admin/stats/revenue?${qs.toString()}`, {
    headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
  });

  const rows = await res.json().catch(() => []);
  const items = Array.isArray(rows) ? rows : [];

  if (!items.length) {
    if (out) out.textContent = "Aucune donnée sur la période.";
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-muted">Aucune donnée</td></tr>`;
    if (totalRevenueEl) totalRevenueEl.textContent = "0.00 €";
    return;
  }

  const totalRevenue = items.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const totalOrders = items.reduce((sum, r) => sum + Number(r.ordersCount || 0), 0);

  if (out) out.textContent = `CA total: ${totalRevenue.toFixed(2)} € | Commandes: ${totalOrders}`;
  if (totalRevenueEl) totalRevenueEl.textContent = `${totalRevenue.toFixed(2)} €`;

  if (tbody) {
    tbody.innerHTML = "";
    for (const r of items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.menuTitre ?? `Menu #${r.menuId}`)}</td>
        <td class="text-end">${Number(r.ordersCount || 0)}</td>
        <td class="text-end">${Number(r.revenue || 0).toFixed(2)} €</td>
      `;
      tbody.appendChild(tr);
    }
  }
}

/* ---------------- RESETS ---------------- */

function bindResets() {
  const btnOrdersReset = document.getElementById("btn-orders-reset");
  const btnRevenueReset = document.getElementById("btn-revenue-reset");

  btnOrdersReset?.addEventListener("click", async () => {
    const form = document.getElementById("form-stats-orders");
    form?.reset();
    await loadOrdersPerMenu({});
  });

  btnRevenueReset?.addEventListener("click", async () => {
    const form = document.getElementById("form-stats-revenue");
    form?.reset();
    await loadRevenue({});
  });
}

/* ---------------- MENUS SELECT (OPTIONNEL) ---------------- */

async function preloadMenusForSelect() {
  const select = document.getElementById("select-menu");
  if (!select || select.dataset.loaded === "1") return;
  select.dataset.loaded = "1";

  try {
    const res = await fetch(`${apiUrl}menu/all`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error("preloadMenusForSelect: HTTP", res.status);
      return;
    }

    const data = await res.json().catch(() => []);
    const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

    for (const m of items) {
      if (!m?.id) continue;

      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.titre ?? `Menu #${m.id}`;
      select.appendChild(opt);
    }
  } catch (e) {
    console.error("preloadMenusForSelect error:", e);
  }
}
/* ---------------- EMPLOYEES ---------------- */

function bindEmployeesRefresh() {
  const btn = document.getElementById("btn-reload-employees");
  if (!btn) return;
  btn.addEventListener("click", loadEmployees);
}

async function loadEmployees() {
  const tbody = document.getElementById("employees-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="3" class="text-muted">Chargement...</td></tr>`;

  try {
    const res = await fetch(`${apiUrl}admin/employees`, {
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("GET employees error:", res.status, data);
      tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Erreur HTTP ${res.status}</td></tr>`;
      return;
    }

    renderEmployees(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error("loadEmployees error:", e);
    tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Erreur réseau/API</td></tr>`;
  }
}

function renderEmployees(list) {
  const tbody = document.getElementById("employees-tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">Aucun employé trouvé.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  for (const u of list) {
    const active = !!u.isActive;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.email ?? "")}</td>
      <td>
        <span class="badge ${active ? "text-bg-success" : "text-bg-secondary"}">
          ${active ? "Oui" : "Non"}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm ${active ? "btn-outline-danger" : "btn-outline-success"}"
                data-emp-action="${active ? "disable" : "enable"}"
                data-emp-id="${u.id}">
          ${active ? "Désactiver" : "Réactiver"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("[data-emp-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.empId;
      const action = btn.dataset.empAction; // enable | disable

      const res = await fetch(`${apiUrl}admin/employees/${encodeURIComponent(id)}/${action}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "X-AUTH-TOKEN": getToken(),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("toggle employee error:", res.status, txt);
        alert("Impossible de modifier le statut de l’employé.");
        return;
      }

      await loadEmployees();
    });
  });
}

/* ---------------- UTIL ---------------- */

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
