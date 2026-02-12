// employee.js
// Dépendances globales: apiUrl, isConnected(), getToken(), route()

const TABS = ["menus", "commandes", "avis"];

initEmployee();

async function initEmployee() {
  const errorEl = document.getElementById("employee-error");
  const welcomeEl = document.getElementById("employee-welcome");
  const btnRefresh = document.getElementById("btn-refresh");

  hideError();

  // Guard connecté
  if (!isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  // Guard rôles
  const me = await fetchMe();
  if (!me) {
    showError("Impossible de vérifier ton compte.");
    return;
  }

  const roles = me.roles ?? [];
  const isStaff = roles.includes("ROLE_EMPLOYEE") || roles.includes("ROLE_ADMIN");
  if (!isStaff) {
    window.location.href = `/account`;
    return;
  }

  if (welcomeEl) {
    const label = roles.includes("ROLE_ADMIN") ? "Admin" : "Employé";
    welcomeEl.textContent = `Connecté en tant que ${label}: ${me.prenom ?? ""} ${me.nom ?? ""}`.trim();
  }

  // Tabs UI
  bindTabs();

  // Default tab depuis URL
  const tab = getTabFromUrl() || "commandes";
  setActiveTab(tab);

  // Charger tab active
  await loadTab(tab);

  // refresh
  btnRefresh?.addEventListener("click", async () => {
    const active = getActiveTab();
    await loadTab(active);
  });

  // MENUS: create form
  const menuForm = document.getElementById("menu-create-form");
  menuForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    menuForm.classList.add("was-validated");
    if (!menuForm.checkValidity()) return;

    const payload = {
      titre: val("m_titre"),
      description: val("m_desc"),
      nb_personne_mini: Number(val("m_nbmin")),
      prix_par_personne: Number(val("m_prix")),
      quantite_restaurant: Number(val("m_stock")),
      pret_materiel: Boolean(document.getElementById("m_pret")?.checked),
    };

    const btn = document.getElementById("m_submit");
    lockBtn(btn, true, "Création…");

    try {
      const res = await fetch(`${apiUrl}menu`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": getToken(),
        },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      const data = safeJson(txt);

      if (!res.ok) {
        console.error("POST menu error:", res.status, data || txt);
        alert("Erreur création menu. Vérifie les champs.");
        return;
      }

      alert("Menu créé ✅");
      menuForm.reset();
      menuForm.classList.remove("was-validated");

      if (getActiveTab() === "menus") await loadMenus();
    } catch (err) {
      console.error(err);
      alert("Impossible de créer le menu (réseau/API).");
    } finally {
      lockBtn(btn, false, "Créer le menu");
    }
  });

  // COMMANDES: filtre
  document.getElementById("cmd-filter-btn")?.addEventListener("click", async () => {
    await loadCommandes();
  });

  // AVIS: refresh
  document.getElementById("avis-refresh")?.addEventListener("click", async () => {
    await loadAvis();
  });

  // Modal annulation confirm
  document.getElementById("cancel-submit")?.addEventListener("click", async () => {
    await submitCancel();
  });

  // ---------- helpers ----------
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove("d-none");
  }
  function hideError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("d-none");
  }
}

function bindTabs() {
  document.querySelectorAll(".employee-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.dataset.tab;
      if (!TABS.includes(tab)) return;

      setActiveTab(tab);
      updateUrlTab(tab);
      await loadTab(tab);
    });
  });
}

function getActiveTab() {
  const btn = document.querySelector(".employee-tab.is-active");
  return btn?.dataset?.tab || "commandes";
}

function setActiveTab(tab) {
  document.querySelectorAll(".employee-tab").forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle("is-active", active);
    b.classList.toggle("btn-secondary", active);
    b.classList.toggle("btn-outline-secondary", !active);
  });

  TABS.forEach((t) => {
    document.getElementById(`panel-${t}`)?.classList.toggle("d-none", t !== tab);
  });
}

function updateUrlTab(tab) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  window.history.replaceState({}, "", url.toString());
}

function getTabFromUrl() {
  const url = new URL(window.location.href);
  const tab = url.searchParams.get("tab");
  return TABS.includes(tab) ? tab : null;
}

async function loadTab(tab) {
  if (tab === "menus") return loadMenus();
  if (tab === "commandes") return loadCommandes();
  if (tab === "avis") return loadAvis();
}

/* ---------------- MENUS ---------------- */

async function loadMenus() {
  const listEl = document.getElementById("menus-list");
  const searchEl = document.getElementById("menus-search");
  if (!listEl) return;

  listEl.innerHTML = `<p class="text-muted mb-0">Chargement…</p>`;

  try {
    const res = await fetch(`${apiUrl}menu/all`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("GET menu/all failed");

    let menus = await res.json();
    if (!Array.isArray(menus)) menus = [];

    const q = (searchEl?.value ?? "").trim().toLowerCase();
    if (q) {
      menus = menus.filter((m) =>
        String(m.titre ?? "").toLowerCase().includes(q)
      );
    }

    if (menus.length === 0) {
      listEl.innerHTML = `<p class="text-muted mb-0">Aucun menu.</p>`;
      return;
    }

    listEl.innerHTML = `
      <div class="list-group">
        ${menus
          .map(
            (m) => `
          <button type="button" class="list-group-item list-group-item-action menu-pick"
            data-id="${m.id}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">${escapeHtml(m.titre ?? "Menu")}</div>
                <div class="small text-muted">
                  Stock: ${escapeHtml(String(m.quantite_restaurant ?? 0))}
                  ${m.pret_materiel ? " • Prêt matériel" : ""}
                </div>
              </div>
              <span class="badge text-bg-secondary">${escapeHtml(String(m.id))}</span>
            </div>
          </button>
        `
          )
          .join("")}
      </div>
      <p class="text-muted small mt-2 mb-0">
        Sélectionne un menu pour gérer ses plats, photos et allergènes.
      </p>
    `;

    // bind picks
    listEl.querySelectorAll(".menu-pick").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await openMenuEditor(id);
      });
    });

    // bind search live
    if (searchEl && !searchEl.dataset.bound) {
      searchEl.dataset.bound = "1";
      searchEl.addEventListener("input", () => loadMenus());
    }
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<p class="text-danger mb-0">Impossible de charger les menus.</p>`;
  }
}

async function openMenuEditor(menuId) {
  const editor = document.getElementById("menu-editor");
  const content = document.getElementById("menu-editor-content");
  if (!editor || !content) return;

  editor.classList.remove("d-none");
  content.innerHTML = `
    <div class="alert alert-info">
      Menu #${escapeHtml(String(menuId))} sélectionné.
      Prochaine étape: CRUD Plat + upload photo + choix allergènes + liaison au menu.
    </div>
  `;
}

/* ---------------- COMMANDES ---------------- */

async function loadCommandes() {
  const listEl = document.getElementById("cmd-list");
  const statutEl = document.getElementById("cmd-filter-statut");
  const qEl = document.getElementById("cmd-filter-q");
  if (!listEl) return;

  listEl.innerHTML = `<p class="text-muted mb-0">Chargement…</p>`;

  const statut = (statutEl?.value ?? "").trim();
  const q = (qEl?.value ?? "").trim();

  const url = new URL(`${apiUrl}commande`, window.location.origin);
  if (statut) url.searchParams.set("statut", statut);
  if (q) url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`GET commande failed ${res.status} ${txt}`);
    }

    const data = await res.json();
    const commandes = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

    if (commandes.length === 0) {
      listEl.innerHTML = `<p class="text-muted mb-0">Aucune commande.</p>`;
      return;
    }

    listEl.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Statut</th>
              <th>Prestation</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${commandes.map(renderCommandeRow).join("")}
          </tbody>
        </table>
      </div>
    `;

    // bind actions
    listEl.querySelectorAll("[data-action='next']").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.dataset.id;
        const next = b.dataset.next;
        await patchStatut(id, next);
      });
    });

    listEl.querySelectorAll("[data-action='cancel']").forEach((b) => {
      b.addEventListener("click", () => {
        openCancelModal(b.dataset.id);
      });
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<p class="text-danger mb-0">Impossible de charger les commandes.</p>`;
  }
}

function renderCommandeRow(c) {
  const id = escapeHtml(String(c.id ?? ""));
  
  const clientRaw =
  c.client?.email ??
  c.user?.email ??
  c.email ??
  `${c.nom ?? ""} ${c.prenom ?? ""}`.trim();
    
  const client = escapeHtml(clientRaw || "—");

  const statut = escapeHtml(String(c.statut ?? "—"));
  const date = escapeHtml(String(c.date_prestation ?? "—"));
  const heure = escapeHtml(String(c.heure_prestation ?? "—"));

  // TODO: map statut -> next statut
  const nextStatut = guessNextStatut(c.statut);

  const nextBtn = nextStatut
    ? `<button class="btn btn-secondary btn-sm" data-action="next" data-id="${id}" data-next="${escapeHtml(nextStatut)}">
         Étape suivante
       </button>`
    : "";

  return `
    <tr>
      <td>${id}</td>
      <td>${client}</td>
      <td><span class="badge text-bg-secondary">${statut}</span></td>
      <td class="small text-muted">${date} ${heure}</td>
      <td class="text-end">
        <div class="d-inline-flex gap-2">
          ${nextBtn}
          <button class="btn btn-outline-secondary btn-sm" data-action="cancel" data-id="${id}">
            Annuler
          </button>
        </div>
      </td>
    </tr>
  `;
}

function guessNextStatut(statut) {
  // Adapte à tes valeurs d'enum exactes
  const s = String(statut ?? "");
  const order = [
    "en_attente",
    "acceptee",
    "en_preparation",
    "en_cours_de_livraison",
    "livree",
    "en_attente_du_retour_de_materiel",
    "terminee",
  ];

  const idx = order.indexOf(s);
  if (idx === -1) return null;
  if (idx === order.length - 1) return null;

  // Important: le passage "livree" -> "terminee" dépend du prêt matériel
  // Ici on laisse la logique simple. On gérera ça côté API avec pret_materiel.
  return order[idx + 1];
}

async function patchStatut(id, statut) {
  try {
    const res = await fetch(`${apiUrl}commande/${encodeURIComponent(id)}/statut`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
      body: JSON.stringify({ statut }),
    });

    const txt = await res.text().catch(() => "");
    const data = safeJson(txt);

    if (!res.ok) {
      console.error("PATCH statut error:", res.status, data || txt);
      alert("Impossible de changer le statut.");
      return;
    }

    await loadCommandes();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau/API.");
  }
}

/* ---------------- ANNULATION ---------------- */

function openCancelModal(commandeId) {
  document.getElementById("cancel-commande-id").value = commandeId;
  document.getElementById("cancel-contact").value = "";
  document.getElementById("cancel-motif").value = "";

  // Bootstrap modal
  const el = document.getElementById("modal-cancel");
  if (!el || !window.bootstrap) {
    alert("Modal indisponible (Bootstrap JS non chargé).");
    return;
  }
  const modal = bootstrap.Modal.getOrCreateInstance(el);
  modal.show();
}

async function submitCancel() {
  const id = document.getElementById("cancel-commande-id").value;
  const mode_contact = document.getElementById("cancel-contact").value;
  const motif = (document.getElementById("cancel-motif").value ?? "").trim();

  if (!id) return;

  if (!mode_contact || !motif) {
    alert("Mode de contact et motif obligatoires.");
    return;
  }

  try {
    const res = await fetch(`${apiUrl}commande/${encodeURIComponent(id)}/annulation`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
      body: JSON.stringify({ mode_contact, motif }),
    });

    const txt = await res.text().catch(() => "");
    const data = safeJson(txt);

    if (!res.ok) {
      console.error("PATCH annulation error:", res.status, data || txt);
      alert("Impossible d’annuler la commande.");
      return;
    }

    // close modal
    const el = document.getElementById("modal-cancel");
    if (el && window.bootstrap) bootstrap.Modal.getOrCreateInstance(el).hide();

    await loadCommandes();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau/API.");
  }
}

/* ---------------- AVIS ---------------- */

async function loadAvis() {
  const listEl = document.getElementById("avis-list");
  if (!listEl) return;

  listEl.innerHTML = `<p class="text-muted mb-0">Chargement…</p>`;

  try {
    // À adapter à ton endpoint final
    const res = await fetch(`${apiUrl}avis?status=pending`, {
      headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`GET avis failed ${res.status} ${txt}`);
    }

    let avis = await res.json();
    if (!Array.isArray(avis)) avis = [];

    if (avis.length === 0) {
      listEl.innerHTML = `<p class="text-muted mb-0">Aucun avis à valider.</p>`;
      return;
    }

    listEl.innerHTML = `
      <div class="list-group">
        ${avis.map(renderAvisItem).join("")}
      </div>
    `;

    listEl.querySelectorAll("[data-avis-action='validate']").forEach((b) => {
      b.addEventListener("click", async () => patchAvis(b.dataset.id, "validate"));
    });

    listEl.querySelectorAll("[data-avis-action='reject']").forEach((b) => {
      b.addEventListener("click", async () => patchAvis(b.dataset.id, "reject"));
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<p class="text-danger mb-0">Impossible de charger les avis.</p>`;
  }
}

function renderAvisItem(a) {
  const id = escapeHtml(String(a.id ?? ""));
  const who = escapeHtml(a.user?.email ?? a.email ?? "Client");
  const note = escapeHtml(String(a.note ?? a.rating ?? "—"));
  const msg = escapeHtml(a.commentaire ?? a.message ?? "");

  return `
    <div class="list-group-item">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div class="fw-semibold">${who} <span class="text-muted">• note ${note}</span></div>
          <div class="small text-muted">${msg}</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-sm" data-avis-action="validate" data-id="${id}">Valider</button>
          <button class="btn btn-outline-secondary btn-sm" data-avis-action="reject" data-id="${id}">Refuser</button>
        </div>
      </div>
    </div>
  `;
}

async function patchAvis(id, action) {
  try {
    const res = await fetch(`${apiUrl}avis/${encodeURIComponent(id)}/${action}`, {
      method: "PATCH",
      headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("PATCH avis error:", res.status, txt);
      alert("Impossible de mettre à jour cet avis.");
      return;
    }

    await loadAvis();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau/API.");
  }
}

/* ---------------- ME ---------------- */

async function fetchMe() {
  try {
    const res = await fetch(`${apiUrl}account/me`, {
      headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("fetchMe error:", e);
    return null;
  }
}

/* ---------------- utils ---------------- */

function val(id) {
  return (document.getElementById(id)?.value ?? "").trim();
}

function lockBtn(btn, locked, text) {
  if (!btn) return;
  btn.disabled = locked;
  btn.textContent = text;
}

function safeJson(txt) {
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
