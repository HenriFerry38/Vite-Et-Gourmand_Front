// menu-edit.js
// Dépendances globales: apiUrl, isConnected(), getToken(), route()

let MENU_ID = null;
let currentMenu = null;
let allPlats = []; // cache plats existants
let allAllergenes = [];

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
    await Promise.all([loadThemes(), loadRegimes(), loadAllPlats(), loadAllergenes()]);
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

function resolvePhotoSrc(photoValue, fallback = "/images/placeholder.jpg") {
  const v = (photoValue ?? "").trim();
  if (!v) return fallback;

  const baseUrl = apiUrl.replace(/api\/?$/, "");

  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  if (v.startsWith("/uploads/")) return `${baseUrl}${v.replace(/^\//, "")}`;
  if (v.startsWith("/images/")) return v;

  if (v.startsWith("uploads/")) return `${baseUrl}${v}`;
  if (v.startsWith("images/")) return `/${v}`;

  return `${baseUrl}uploads/plats/${v}`;
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

async function uploadPlatPhoto(platId, file) {
  const fd = new FormData();
  fd.append("photo", file);

  const res = await fetch(`${apiUrl}plat/${encodeURIComponent(platId)}/photo`, {
    method: "POST",
    headers: { "X-AUTH-TOKEN": getToken() },
    body: fd,
  });

  const txt = await res.text().catch(() => "");
  const data = safeJson(txt);

  if (!res.ok) {
    const msg = data?.message || data?.detail || txt || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data; // {photo, photo_url...}
}

function safeJson(txt) {
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
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
    const label = it?.libelle ?? it?.titre ?? it?.name ?? (id != null ? `#${id}` : "—");
    if (id == null) continue;
    selectEl.appendChild(new Option(String(label), String(id)));
  }
}

function normalizeCategorie(cat) {
  const c = String(cat ?? "").trim().toLowerCase();
  if (["entree", "entrée", "entrées", "entrees"].includes(c)) return "Entrées";
  if (["plat", "plats"].includes(c)) return "Plats";
  if (["dessert", "desserts"].includes(c)) return "Desserts";
  return "Autres";
}

function fillSelectGroupedByCategorie(selectEl, items, placeholder) {
  const arr = Array.isArray(items) ? items : [];

  selectEl.innerHTML = "";
  selectEl.appendChild(new Option(placeholder, ""));

  // group items
  const groups = new Map(); // label -> array
  for (const it of arr) {
    const id = it?.id;
    if (id == null) continue;

    const label = it?.titre ?? it?.libelle ?? it?.name ?? `#${id}`;
    const groupLabel = normalizeCategorie(it?.categorie);

    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel).push({ id, label });
  }

  // ordering categories
  const order = ["Entrées", "Plats", "Desserts", "Autres"];
  for (const groupLabel of order) {
    const g = groups.get(groupLabel);
    if (!g || g.length === 0) continue;

    // tri alpha (optionnel)
    g.sort((a, b) => String(a.label).localeCompare(String(b.label), "fr"));

    const optgroup = document.createElement("optgroup");
    optgroup.label = groupLabel;

    for (const p of g) {
      optgroup.appendChild(new Option(String(p.label), String(p.id)));
    }

    selectEl.appendChild(optgroup);
  }
}

async function loadAllergenes() {
  const data = await apiAuthFetch("allergene", { method: "GET" });
  allAllergenes = extractItems(data);
  return allAllergenes;
}

async function deletePlatDefinitif(platId) {
  await apiAuthFetch(`plat/${encodeURIComponent(platId)}`, { method: "DELETE" });
}

async function updatePlat(platId, payload) {
  await apiAuthFetch(`plat/${encodeURIComponent(platId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
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

  // menu.theme / menu.regime peuvent être ID (number) OU objet
  const themeId = menu.theme?.id ?? menu.themeId ?? menu.theme ?? "";
  const regimeId = menu.regime?.id ?? menu.regimeId ?? menu.regime ?? "";

  const themeSel = document.getElementById("edit_theme");
  const regimeSel = document.getElementById("edit_regime");
  if (themeSel) themeSel.value = themeId ? String(themeId) : "";
  if (regimeSel) regimeSel.value = regimeId ? String(regimeId) : "";

  setSub(`Menu #${menu.id ?? id}`);

  // plats du menu
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
    const categorie = (document.getElementById("p_categorie")?.value ?? "").trim();

    if (!titre) return setSmallMsg("plat-create-msg", "Titre requis.", true);
    if (!categorie) return setSmallMsg("plat-create-msg", "Catégorie requise.", true);

    // Aligné avec ton PlatController::create()
    const payload = {
      titre,
      categorie,
      photo: null, // optionnel
    };

    try {
      setSmallMsg("plat-create-msg", "Création…");

      const created = await createPlat(payload);
      await loadAllPlats(); // refresh select
      await addPlatToMenu(created.id);

      // reset form
      const t = document.getElementById("p_titre");
      if (t) t.value = "";

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

  const data = await apiAuthFetch("plat", { method: "GET" });
  
  allPlats = extractItems(data);

  // ✅ filtrer ceux déjà dans le menu
  const alreadyIds = new Set(getMenuPlatIds(currentMenu));
  const filtered = allPlats.filter((p) => !alreadyIds.has(Number(p?.id)));

  // ✅ afficher par catégorie (optgroup)
  if (sel) fillSelectGroupedByCategorie(sel, filtered, "Choisir un plat…");

  // petit message si tout est déjà lié
  if (sel && filtered.length === 0) {
    // optionnel: garder le placeholder + désactiver
    sel.disabled = true;
    setSmallMsg("plat-pick-msg", "Tous les plats sont déjà dans ce menu ✅");
  } else if (sel) {
    sel.disabled = false;
    setSmallMsg("plat-pick-msg", "");
  }

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
    // Template si dispo, sinon fallback simple
    const node = tpl?.content?.firstElementChild?.cloneNode(true) ?? document.createElement("div");

    if (!tpl) {
      node.className = "list-group-item d-flex justify-content-between align-items-center gap-3";
      node.innerHTML = `
        <div>
          <div class="fw-semibold" data-field="titre"></div>
          <div class="small text-muted" data-field="meta"></div>
        </div>
        <button class="btn btn-outline-danger btn-sm" data-action="remove-plat">Retirer</button>
      `;
    }

    node.querySelector("[data-field='titre']").textContent = p.titre ?? `Plat #${p.id}`;
    node.querySelector("[data-field='meta']").textContent = `${p.categorie ?? ""}`.trim() || "—";

    // photo preview
    const img = node.querySelector("[data-field='photo']");
    if (img) {
      img.src = resolvePhotoSrc(p.photo);
      img.alt = p.titre ?? "Plat";
      img.onerror = () => { img.src = "/images/placeholder.jpg"; };
    }

    // upload photo
    const input = node.querySelector("[data-action='photo-input']");
    const btnUpload = node.querySelector("[data-action='upload-photo']");

    if (btnUpload && input) {
      btnUpload.addEventListener("click", async () => {
        const file = input.files?.[0];
        if (!file) return alert("Choisis une image d’abord.");

        btnUpload.disabled = true;
        btnUpload.textContent = "Upload…";

        try {
          await uploadPlatPhoto(p.id, file);
          await loadMenu(MENU_ID);   // refresh menu + photos
          await loadAllPlats();      // refresh select
        } catch (e) {
          console.error(e);
          alert(`Erreur upload: ${e.message}`);
        } finally {
          btnUpload.disabled = false;
          btnUpload.textContent = "Photo";
          input.value = "";
        }
      });
    }

    node.querySelector("[data-action='edit-plat']")?.addEventListener("click", () => {
      openEditPlatModal(p);
    });

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

    node.querySelector("[data-action='delete-plat']")?.addEventListener("click", async () => {
      const ok = confirm(`⚠️ Supprimer définitivement "${p.titre ?? "ce plat"}" ?\nIl disparaîtra de la base de données.`);
      if (!ok) return;

      try {
        await deletePlatDefinitif(p.id);
        await loadMenu(MENU_ID);
        await loadAllPlats();
      } catch (e) {
        console.error(e);
        alert(`Erreur suppression: ${e.message}`);
      }
    });

    list.appendChild(node);
  }
}

function openEditPlatModal(plat) {
  document.getElementById("edit-plat-id").value = plat.id;
  document.getElementById("edit-plat-titre").value = plat.titre ?? "";
  document.getElementById("edit-plat-categorie").value = String(plat.categorie ?? "plat").toLowerCase();

  const msg = document.getElementById("edit-plat-msg");
  if (msg) {
    msg.textContent = "";
    msg.className = "small mt-2 text-muted";
  }

  const box = document.getElementById("edit-plat-allergenes");
  box.innerHTML = "";

  const currentIds = new Set(
    (Array.isArray(plat.allergenes) ? plat.allergenes : [])
      .map(a => a?.id)
      .filter(id => typeof id === "number")
  );

  for (const al of allAllergenes) {
    const id = al?.id;
    if (id == null) continue;

    const label = al?.libelle ?? al?.nom ?? `Allergène #${id}`;

    const wrap = document.createElement("label");
    wrap.className = "form-check form-check-inline m-0";

    wrap.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${id}" ${currentIds.has(id) ? "checked" : ""}>
      <span class="form-check-label">${label}</span>
    `;

    box.appendChild(wrap);
  }

  const modalEl = document.getElementById("modal-edit-plat");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

document.getElementById("btn-save-plat")?.addEventListener("click", async () => {
  const id = Number(document.getElementById("edit-plat-id").value);
  const titre = document.getElementById("edit-plat-titre").value.trim();
  const categorie = document.getElementById("edit-plat-categorie").value;

  const msg = document.getElementById("edit-plat-msg");
  const btn = document.getElementById("btn-save-plat");

  if (!titre) {
    if (msg) {
      msg.textContent = "Titre requis.";
      msg.className = "small mt-2 text-danger";
    }
    return;
  }

  const allergenesIds = [...document.querySelectorAll("#edit-plat-allergenes input[type='checkbox']:checked")]
    .map(i => Number(i.value))
    .filter(n => !Number.isNaN(n));

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enregistrement…";
  }
  if (msg) {
    msg.textContent = "Enregistrement…";
    msg.className = "small mt-2 text-muted";
  }

  try {
    await updatePlat(id, { titre, categorie, allergenesIds });

    if (msg) {
      msg.textContent = "Modifié ✅";
      msg.className = "small mt-2 text-success";
    }

    await loadMenu(MENU_ID);
    await loadAllPlats();

    bootstrap.Modal.getInstance(document.getElementById("modal-edit-plat"))?.hide();
  } catch (e) {
    console.error(e);
    if (msg) {
      msg.textContent = `Erreur: ${e.message}`;
      msg.className = "small mt-2 text-danger";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enregistrer";
    }
  }
});

function getMenuPlatIds(menu) {
  const plats = Array.isArray(menu?.plats) ? menu.plats : [];
  return plats
    .map((p) => (typeof p === "number" ? p : p?.id))
    .filter((id) => typeof id === "number");
}

async function addPlatToMenu(platId) {
  if (!MENU_ID) throw new Error("MenuId manquant");

  // évite doublons: si déjà lié, on stop (UX plus clean)
  if (currentMenu) {
    const ids = new Set(getMenuPlatIds(currentMenu));
    if (ids.has(Number(platId))) return;
  }

  // ✅ backend: POST /api/menu/{menuId}/plats/{platId}
  await apiAuthFetch(`menu/${encodeURIComponent(MENU_ID)}/plats/${encodeURIComponent(platId)}`, {
    method: "POST",
  });

  await loadMenu(MENU_ID);
  await loadAllPlats();
}

async function removePlatFromMenu(platId) {
  if (!MENU_ID) throw new Error("MenuId manquant");

  // ✅ backend: DELETE /api/menu/{menuId}/plats/{platId}
  await apiAuthFetch(`menu/${encodeURIComponent(MENU_ID)}/plats/${encodeURIComponent(platId)}`, {
    method: "DELETE",
  });

  await loadMenu(MENU_ID);
  await loadAllPlats();
}

async function createPlat(payload) {
  const created = await apiAuthFetch("plat", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // selon ton controller, ça peut renvoyer un objet (avec id) ou juste 201 vide.
  if (created?.id) return created;

  // fallback: si jamais ton POST /api/plat renvoie 201 sans body,
  // on recharge la liste et on prend le dernier (trié DESC dans index).
  await loadAllPlats();
  const first = allPlats?.[0];
  if (!first?.id) throw new Error("Plat créé mais impossible de récupérer l'id.");
  return first;
}
