// employee.js
// Dépendances globales: apiUrl, isConnected(), getToken(), route()

const TABS = ["menus", "commandes", "avis"];

// ✅ Flag pour ne pas rebinder / recharger 50 fois
let themeRegimeInitDone = false;



export async function init() {
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

    // ✅ themeId / regimeId demandés par Swagger
    const payload = {
      titre: val("m_titre"),
      description: val("m_desc"),
      nb_personne_mini: Number(val("m_nbmin")),
      prix_par_personne: String(val("m_prix")).replace(",", "."),
      quantite_restaurant: Number(val("m_stock")),
      pret_materiel: Boolean(document.getElementById("m_pret")?.checked),

      themeId: Number(val("m_theme")),
      regimeId: Number(val("m_regime")),
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

      // ✅ recharge listes + (optionnel) recharge selects (au cas où)
      if (getActiveTab() === "menus") {
        await Promise.all([loadMenus(), loadThemes(), loadRegimes()]);
      }
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
  if (tab === "menus") {
    // ✅ init pickers seulement quand on ouvre l’onglet menus
    await initThemeRegimePickers();
    return loadMenus();
  }
  if (tab === "commandes") return loadCommandes();
  if (tab === "avis") return loadAvis();
}

/* ---------------- MENUS ---------------- */

async function loadMenus() {
  const listEl = document.getElementById("menus-list");
  const searchEl = document.getElementById("menus-search");
  const tpl = document.getElementById("tpl-menu-item");

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

    // ✅ container pour les items
    listEl.innerHTML = `
      <div class="list-group" id="menus-group"></div>
      <p class="text-muted small mt-2 mb-0">
        Sélectionne un menu pour gérer ses plats, photos et allergènes.
      </p>
    `;

    const group = document.getElementById("menus-group");

    // sécurité: template absent
    if (!tpl) {
      console.warn("Template #tpl-menu-item introuvable");
      return;
    }

    menus.forEach((m) => {
      const node = tpl.content.firstElementChild.cloneNode(true);

      const id = String(m.id ?? "");
      const titre = m.titre ?? "Menu";
      const stock = String(m.quantite_restaurant ?? 0);
      const pret = m.pret_materiel ? " • Prêt matériel" : "";

      // champs texte
      const elTitre = node.querySelector('[data-field="titre"]');
      const elMeta = node.querySelector('[data-field="meta"]');
      const elId = node.querySelector('[data-field="id"]');

      if (elTitre) elTitre.textContent = titre;
      if (elMeta) elMeta.textContent = `Stock: ${stock}${pret}`;
      if (elId) elId.textContent = id;

      // actions
      const btnSelect = node.querySelector('[data-action="select"]');
      const linkEdit = node.querySelector('[data-action="edit"]');
      const btnDelete = node.querySelector('[data-action="delete"]');

      // Sélectionner (ouvre ton editor actuel)
      btnSelect?.addEventListener("click", async () => {
        await openMenuEditor(id);
      });

      // Modifier (route SPA vers page edit)
      if (linkEdit) {
        linkEdit.setAttribute("href", `/menu-edit?id=${encodeURIComponent(id)}`);
        linkEdit.addEventListener("click", (e) => {
          // si ton route() existe globalement, on le laisse gérer
          route(e);
        });
      }

      // Supprimer
      btnDelete?.addEventListener("click", async () => {
        await deleteMenu(id);
      });

      group.appendChild(node);
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

async function deleteMenu(id) {
  const ok = confirm("⚠️ Supprimer ce menu ?\nCette action est irréversible.");
  if (!ok) return;

  try {
    const res = await fetch(`${apiUrl}menu/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
    });

    const txt = await res.text().catch(() => "");
    const data = safeJson(txt);

    if (!res.ok) {
      console.error("DELETE menu error:", res.status, data || txt);
      alert("Impossible de supprimer le menu.");
      return;
    }

    alert("Menu supprimé ✅");
    await loadMenus();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau/API.");
  }
}
/* ---------------- THEME / REGIME (NEW) ---------------- */

// ✅ Fetch helper avec token
async function apiAuthFetch(path, options = {}) {
  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-AUTH-TOKEN": getToken(),
      ...(options.headers || {}),
    },
  });

  const txt = await res.text().catch(() => "");
  const data = safeJson(txt);

  if (!res.ok) {
    const msg = data?.message || data?.detail || txt || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function fillSelectByLibelle(selectEl, items, placeholder) {
  selectEl.innerHTML = "";
  selectEl.appendChild(new Option(placeholder, ""));
  for (const it of items) {
    selectEl.appendChild(new Option(it.libelle ?? `#${it.id}`, String(it.id)));
  }
}

function extractItems(data) {
  return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
}

async function loadThemes() {
  const sel = document.getElementById("m_theme");
  if (!sel) return [];
  sel.innerHTML = `<option value="">Chargement…</option>`;

  const data = await apiAuthFetch("theme", { method: "GET" }); // GET /api/theme
  const items = extractItems(data);
  fillSelectByLibelle(sel, items, "Choisir un thème…");
  return items;
}

async function loadRegimes() {
  const sel = document.getElementById("m_regime");
  if (!sel) return [];
  sel.innerHTML = `<option value="">Chargement…</option>`;

  const data = await apiAuthFetch("regime", { method: "GET" }); // GET /api/regime
  const items = extractItems(data);
  fillSelectByLibelle(sel, items, "Choisir un régime…");
  return items;
}

async function createTheme(libelle) {
  return apiAuthFetch("theme", {
    method: "POST",
    body: JSON.stringify({ libelle }),
  });
}

async function createRegime(libelle) {
  return apiAuthFetch("regime", {
    method: "POST",
    body: JSON.stringify({ libelle }),
  });
}

function setupThemeRegimeUI() {
  const themeToggle = document.getElementById("btnThemeToggle");
  const themeBox = document.getElementById("themeCreateBox");
  const themeInput = document.getElementById("themeLibelleInput");
  const themeCreateBtn = document.getElementById("btnThemeCreate");
  const themeMsg = document.getElementById("themeMsg");
  const themeSelect = document.getElementById("m_theme");

  const regimeToggle = document.getElementById("btnRegimeToggle");
  const regimeBox = document.getElementById("regimeCreateBox");
  const regimeInput = document.getElementById("regimeLibelleInput");
  const regimeCreateBtn = document.getElementById("btnRegimeCreate");
  const regimeMsg = document.getElementById("regimeMsg");
  const regimeSelect = document.getElementById("m_regime");

  themeToggle?.addEventListener("click", () => {
    if (themeMsg) themeMsg.textContent = "";
    themeBox?.classList.toggle("d-none");
    themeInput?.focus();
  });

  regimeToggle?.addEventListener("click", () => {
    if (regimeMsg) regimeMsg.textContent = "";
    regimeBox?.classList.toggle("d-none");
    regimeInput?.focus();
  });

  themeCreateBtn?.addEventListener("click", async () => {
    const libelle = (themeInput?.value ?? "").trim();
    if (!libelle) return (themeMsg.textContent = "Libellé requis.");
    themeMsg.textContent = "Création…";

    try {
      const created = await createTheme(libelle); // {id, libelle, createdAt}
      await loadThemes();
      if (themeSelect) themeSelect.value = String(created.id);
      if (themeInput) themeInput.value = "";
      themeBox?.classList.add("d-none");
      themeMsg.textContent = "";
    } catch (e) {
      themeMsg.textContent = `Erreur: ${e.message}`;
    }
  });

  regimeCreateBtn?.addEventListener("click", async () => {
    const libelle = (regimeInput?.value ?? "").trim();
    if (!libelle) return (regimeMsg.textContent = "Libellé requis.");
    regimeMsg.textContent = "Création…";

    try {
      const created = await createRegime(libelle);
      await loadRegimes();
      if (regimeSelect) regimeSelect.value = String(created.id);
      if (regimeInput) regimeInput.value = "";
      regimeBox?.classList.add("d-none");
      regimeMsg.textContent = "";
    } catch (e) {
      regimeMsg.textContent = `Erreur: ${e.message}`;
    }
  });
}

async function initThemeRegimePickers() {
  if (themeRegimeInitDone) return;

  // On ne fait l'init que si les éléments existent (onglet menus)
  const themeSel = document.getElementById("m_theme");
  const regimeSel = document.getElementById("m_regime");
  if (!themeSel || !regimeSel) return;

  themeRegimeInitDone = true;

  setupThemeRegimeUI();

  try {
    await Promise.all([loadThemes(), loadRegimes()]);
  } catch (e) {
    console.error("initThemeRegimePickers:", e);
  }
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

    listEl.querySelectorAll("[data-action='restitution']").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.dataset.id;
        await patchRestitutionMateriel(id);
        await loadCommandes();
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
  
  const canConfirmRestitution = String(c.statut) === "retour_materiel" && !c.restitution_materiel;
  const restitutionBtn = canConfirmRestitution
    ? `<button class="btn btn-outline-success btn-sm"
              data-action="restitution"
              data-id="${id}">
          Valider retour matériel
      </button>`
    : "";

  const nextStatut = guessNextStatut(c);

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
          ${restitutionBtn}
          ${nextBtn}
          <button class="btn btn-outline-secondary btn-sm" data-action="cancel" data-id="${id}">
            Annuler
          </button>
        </div>
      </td>
    </tr>
  `;
}

function guessNextStatut(commande) {
  const s = String(commande?.statut ?? "");
  const needsRestitution = commande?.restitution_materiel === true;

  const order = needsRestitution
    ? ["en_attente", "acceptee", "preparation", "livraison", "livree", "retour_materiel", "terminee"]
    : ["en_attente", "acceptee", "preparation", "livraison", "livree", "terminee"];

  const idx = order.indexOf(s);
  if (idx === -1) return null;
  if (idx === order.length - 1) return null;

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

      // Bonus utile: si ton API renvoie allowedNext, on l'affiche
      if (res.status === 409 && data?.allowedNext?.length) {
        alert(`${data.message || "Transition non autorisée."}\nÉtape(s) possible(s): ${data.allowedNext.join(", ")}`);
        return;
      }

      alert(data?.message || "Impossible de changer le statut.");
      return;
    }

    await loadCommandes();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau/API.");
  }
}

async function patchRestitutionMateriel(id) {
  try {
    const res = await fetch(
      `${apiUrl}commande/${encodeURIComponent(id)}/restitution-materiel`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": getToken(),
        },
        body: JSON.stringify({ restitution_materiel: true }),
      }
    );

    const txt = await res.text().catch(() => "");
    const data = safeJson(txt);

    if (!res.ok) {
      console.error("PATCH restitution error:", res.status, data || txt);
      alert(data?.message || "Impossible de valider le retour matériel.");
      return;
    }
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
