// menu-edit.js
// Dépendances globales: apiUrl, isConnected(), getToken(), route()

let MENU_ID = null;
let currentMenu = null;
let allPlats = []; // cache plats existants

export async function init() {
  // Guard connecté
  if (!isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  MENU_ID = new URLSearchParams(window.location.search).get("id");
  if (!MENU_ID) {
    alert("ID menu manquant.");
    window.location.href = "/employee?tab=menus";
    return;
  }

  // bind actions (menu)
  document.getElementById("menu-edit-form")?.addEventListener("submit", (e) => submitEdit(e, MENU_ID));
  document.getElementById("btn-delete-menu")?.addEventListener("click", () => deleteMenu(MENU_ID));

  // bind actions (plats)
  bindPlatsUI();

  // load pickers + menu + plats list
  try {
    setMsg("Chargement…");
    await Promise.all([
      loadThemes(),
      loadRegimes(),
      loadAllPlats(), // charge le select des plats existants
    ]);
    await loadMenu(MENU_ID);
    setMsg("");
  } catch (e) {
    console.error(e);
    setMsg(`Erreur: ${e.message}`, true);
  }
}

/* ---------------- UI helpers ---------------- */

function setMsg(text, isError = false) {
  const el = document.getElementById("edit-msg");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("text-danger", !!isError);
  el.classList.toggle("text-muted", !isError);
}

function setSub(text) {
  const sub = document.getElementById("edit-subtitle");
  if (sub) sub.textContent = text || "";
}

function setSmallMsg(id, text, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("text-danger", !!isError);
  el.classList.toggle("text-muted", !isError);
}

/* ---------------- API ---------------- */

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

function safeJson(txt) {
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function fillSelect(selectEl, items, placeholder) {
  const arr = Array.isArray(items) ? items : [];
  selectEl.innerHTML = "";
  selectEl.appendChild(new Option(placeholder, ""));

  for (const it of arr) {
    const id = it?.id;
    const label =
      it?.libelle ??
      it?.titre ??
      it?.name ??
      (id != null ? `#${id}` : "—");

    if (id == null) continue;
    selectEl.appendChild(new Option(String(label), String(id)));
  }
}

/* ---------------- Theme / Regime ---------------- */

async function loadThemes() {
  const sel = document.getElementById("edit_theme");
  if (!sel) return;
  sel.innerHTML = `<option value="">Chargement…</option>`;
  const data = await apiAuthFetch("theme", { method: "GET" });
  fillSelect(sel, extractItems(data), "Choisir un thème…");
}

async function loadRegimes() {
  const sel = document.getElementById("edit_regime");
  if (!sel) return;
  sel.innerHTML = `<option value="">Chargement…</option>`;
  const data = await apiAuthFetch("regime", { method: "GET" });
  fillSelect(sel, extractItems(data), "Choisir un régime…");
}

/* ---------------- Menu load / save ---------------- */

async function loadMenu(id) {
  setMsg("Chargement du menu…");

  const menu = await apiAuthFetch(`menu/${encodeURIComponent(id)}`, { method: "GET" });
  currentMenu = menu;

  document.getElementById("edit_id").value = menu.id ?? id;
  document.getElementById("edit_titre").value = menu.titre ?? "";
  document.getElementById("edit_desc").value = menu.description ?? "";
  document.getElementById("edit_nbmin").value = menu.nb_personne_mini ?? 1;
  document.getElementById("edit_prix").value = menu.prix_par_personne ?? "";
  document.getElementById("edit_stock").value = menu.quantite_restaurant ?? 0;
  document.getElementById("edit_pret").checked = !!menu.pret_materiel;

  // IMPORTANT: chez toi menu.theme et menu.regime peuvent être un ID (number) OU objet
  const themeId = menu.theme?.id ?? menu.themeId ?? menu.theme ?? "";
  const regimeId = menu.regime?.id ?? menu.regimeId ?? menu.regime ?? "";

  const themeSel = document.getElementById("edit_theme");
  const regimeSel = document.getElementById("edit_regime");
  if (themeSel) themeSel.value = themeId ? String(themeId) : "";
  if (regimeSel) regimeSel.value = regimeId ? String(regimeId) : "";

  setSub(`Menu #${menu.id ?? id}`);

  // plats du menu (si présents)
  renderMenuPlats(menu);

  setMsg("");
}

async function submitEdit(e, id) {
  e.preventDefault();

  const form = document.getElementById("menu-edit-form");
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  const payload = {
    titre: document.getElementById("edit_titre").value.trim(),
    description: document.getElementById("edit_desc").value.trim(),
    nb_personne_mini: Number(document.getElementById("edit_nbmin").value),
    // DECIMAL attendu en string côté Symfony chez toi
    prix_par_personne: String(document.getElementById("edit_prix").value).replace(",", "."),
    quantite_restaurant: Number(document.getElementById("edit_stock").value),
    pret_materiel: !!document.getElementById("edit_pret").checked,

    themeId: Number(document.getElementById("edit_theme").value),
    regimeId: Number(document.getElementById("edit_regime").value),
  };

  const btn = document.getElementById("btn-save-menu");
  if (btn) btn.disabled = true;
  setMsg("Enregistrement…");

  try {
    await apiAuthFetch(`menu/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setMsg("Menu modifié ✅");
    // recharge menu (pour garder synchro)
    await loadMenu(id);
    setTimeout(() => setMsg(""), 600);
  } catch (err) {
    console.error(err);
    setMsg(`Erreur: ${err.message}`, true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function deleteMenu(id) {
  const ok = confirm("⚠️ Supprimer ce menu ?\nCette action est irréversible.");
  if (!ok) return;

  setMsg("Suppression…");

  try {
    await apiAuthFetch(`menu/${encodeURIComponent(id)}`, { method: "DELETE" });
    alert("Menu supprimé ✅");
    window.location.href = "/employee?tab=menus";
  } catch (err) {
    console.error(err);
    setMsg(`Erreur suppression: ${err.message}`, true);
  }
}

/* ---------------- PLATS (menu-edit) ---------------- */

function bindPlatsUI() {
  // Ajouter plat existant
  document.getElementById("btn-add-plat")?.addEventListener("click", async () => {
    const sel = document.getElementById("plat_pick");
    const platId = sel?.value ? Number(sel.value) : null;
    if (!platId) return setSmallMsg("plat-pick-msg", "Choisis un plat.", true);

    try {
      setSmallMsg("plat-pick-msg", "Ajout…");
      await addPlatToMenu(platId);
      setSmallMsg("plat-pick-msg", "Ajouté ✅");
      setTimeout(() => setSmallMsg("plat-pick-msg", ""), 800);
    } catch (e) {
      console.error(e);
      setSmallMsg("plat-pick-msg", `Erreur: ${e.message}`, true);
    }
  });

  // Toggle création
  document.getElementById("btn-toggle-plat-create")?.addEventListener("click", () => {
    document.getElementById("plat-create-box")?.classList.toggle("d-none");
  });

  // Créer plat + ajouter
  document.getElementById("btn-create-plat")?.addEventListener("click", async () => {
    const titre = (document.getElementById("p_titre")?.value ?? "").trim();
    if (!titre) return setSmallMsg("plat-create-msg", "Titre requis.", true);

    const payload = {
      titre,
      description: (document.getElementById("p_desc")?.value ?? "").trim(),
      prix: String(document.getElementById("p_prix")?.value ?? "").replace(",", "."),
      categorie: (document.getElementById("p_categorie")?.value ?? "plat"),
    };

    try {
      setSmallMsg("plat-create-msg", "Création…");
      const created = await createPlat(payload);
      await loadAllPlats(); // refresh select
      await addPlatToMenu(created.id);

      // reset form
      document.getElementById("p_titre").value = "";
      document.getElementById("p_desc").value = "";
      document.getElementById("p_prix").value = "";

      setSmallMsg("plat-create-msg", "Créé + ajouté ✅");
      setTimeout(() => setSmallMsg("plat-create-msg", ""), 900);
    } catch (e) {
      console.error(e);
      setSmallMsg("plat-create-msg", `Erreur: ${e.message}`, true);
    }
  });
}

async function loadAllPlats() {
  const sel = document.getElementById("plat_pick");
  if (sel) sel.innerHTML = `<option value="">Chargement…</option>`;

  // ⚠️ adapte si ton endpoint est différent
  // je tente "plat/all" puis "plat"
  let data;
  try {
    data = await apiAuthFetch("plat/all", { method: "GET" });
  } catch {
    data = await apiAuthFetch("plat", { method: "GET" });
  }

  allPlats = extractItems(data);

  if (sel) fillSelect(sel, allPlats, "Choisir un plat…");
  return allPlats;
}

function renderMenuPlats(menu) {
  const list = document.getElementById("menu-plats-list");
  const count = document.getElementById("plats-count");
  const tpl = document.getElementById("tpl-menu-plat-item");

  if (!list) return;

  const plats = Array.isArray(menu?.plats) ? menu.plats : [];

  if (count) count.textContent = plats.length <= 1 ? `${plats.length} plat` : `${plats.length} plats`;

  if (plats.length === 0) {
    list.innerHTML = `<div class="list-group-item text-muted small">Aucun plat lié à ce menu.</div>`;
    return;
  }

  list.innerHTML = "";
  for (const p of plats) {
    const node = tpl?.content?.firstElementChild?.cloneNode(true);
    if (!node) continue;

    node.querySelector("[data-field='titre']").textContent = p.titre ?? `Plat #${p.id}`;
    node.querySelector("[data-field='meta']").textContent =
      `${p.categorie ?? ""}${p.prix ? ` • ${p.prix}€` : ""}`.trim() || "—";

    node.querySelector("[data-action='remove-plat']")?.addEventListener("click", async () => {
      const ok = confirm(`Retirer "${p.titre ?? "ce plat"}" du menu ?`);
      if (!ok) return;

      try {
        await removePlatFromMenu(p.id);
      } catch (e) {
        console.error(e);
        alert(`Erreur: ${e.message}`);
      }
    });

    list.appendChild(node);
  }
}

function getMenuPlatIds(menu) {
  const plats = Array.isArray(menu?.plats) ? menu.plats : [];
  return plats.map((p) => p?.id).filter((x) => typeof x === "number");
}

async function addPlatToMenu(platId) {
  if (!currentMenu) await loadMenu(MENU_ID);

  const ids = new Set(getMenuPlatIds(currentMenu));
  ids.add(Number(platId));

  await persistMenuPlats([...ids]);
  await loadMenu(MENU_ID); // refresh affichage
}

async function removePlatFromMenu(platId) {
  if (!currentMenu) await loadMenu(MENU_ID);

  const ids = new Set(getMenuPlatIds(currentMenu));
  ids.delete(Number(platId));

  await persistMenuPlats([...ids]);
  await loadMenu(MENU_ID);
}

async function persistMenuPlats(platIds) {
  // Ici, on gère plusieurs styles d’API pour ne pas te bloquer:
  // 1) PATCH /api/menu/{id}/plats   { platIds: [...] }
  // 2) PUT   /api/menu/{id}         { platIds: [...] }
  // 3) PUT   /api/menu/{id}         { plats: [...] }
  const id = MENU_ID;

  const tries = [
    () => apiAuthFetch(`menu/${encodeURIComponent(id)}/plats`, {
      method: "PATCH",
      body: JSON.stringify({ platIds }),
    }),
    () => apiAuthFetch(`menu/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ platIds }),
    }),
    () => apiAuthFetch(`menu/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ plats: platIds }),
    }),
  ];

  let lastErr = null;
  for (const t of tries) {
    try {
      await t();
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Impossible d’enregistrer les plats du menu.");
}

async function createPlat(payload) {
  // ⚠️ adapte selon ton DTO backend
  // je tente /api/plat (POST)
  const created = await apiAuthFetch("plat", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!created?.id) {
    throw new Error("Plat créé mais réponse sans id.");
  }
  return created;
}
