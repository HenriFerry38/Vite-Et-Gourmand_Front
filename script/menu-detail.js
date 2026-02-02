// menu-detail.js
// Requiert ton script global déjà chargé: apiUrl, getToken(), isConnected(), route()

async function initMenuDetail() {
  const container = document.getElementById("menu-detail-container");
  const extras = document.getElementById("menu-detail-extras");
  const errorEl = document.getElementById("menu-detail-error");
  const heroTitle = document.getElementById("detail-hero-title");

  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const menuId = params.get("id");

  hideError();

  // 1) Vérif id
  if (!menuId) {
    showError("Aucun menu sélectionné (paramètre ?id= manquant).");
    container.innerHTML = "";
    if (extras) extras.classList.add("d-none");
    return;
  }

  // 2) Loader
  container.innerHTML = `<p class="text-center my-4">Chargement du menu…</p>`;
  if (extras) extras.classList.add("d-none");

  // 3) Fetch menu
  let menu;
  try {
    const res = await fetch(`${apiUrl}menu/${encodeURIComponent(menuId)}`, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`GET menu ${res.status} ${txt}`);
    }

    menu = await res.json();
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
    showError("Impossible d’afficher ce menu.");
    return;
  }

  // 4) Render card principale
  container.innerHTML = "";
  container.appendChild(renderMenuCard(menu));

  // 5) Hero title
  if (heroTitle && menu?.titre) heroTitle.textContent = menu.titre;

  // 6) Remplir extras (listes plats + stock + form)
  if (extras) {
    fillExtras(menu);
    extras.classList.remove("d-none");
  }

  // 7) Form commande
  setupOrderForm(menu);

  // ---------------- helpers ----------------
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

function renderMenuCard(menu) {
  const template = document.getElementById("menu-template");
  const clone = template.content.cloneNode(true);

  // champs principaux
  clone.querySelector(".veg-menu__title").textContent = menu.titre ?? "Menu";
  clone.querySelector(".veg-menu__desc").textContent = menu.description ?? "";

  // si theme/regime sont IDs -> fallback
  const themeLabel =
    menu.theme?.libelle ??
    (menu.theme ? `Thème #${menu.theme}` : "Thème ?");

  const regimeLabel =
    menu.regime?.libelle ??
    (menu.regime ? `Régime #${menu.regime}` : "?");

  clone.querySelector(".veg-menu__subtitle").textContent = themeLabel;
  clone.querySelector(".veg-regime").textContent = regimeLabel;

  // meta chiffres
  clone.querySelector(".veg-nb").textContent = menu.nb_personne_mini ?? 1;
  clone.querySelector(".veg-prix").textContent =
    `${formatEuro(menu.prix_par_personne)} / pers`;

  // image placeholder (tu brancheras ton champ image plus tard)
  const img = clone.querySelector(".veg-menu__photo");
  if (img) {
    img.src = "../images/placeholder.jpg";
    img.alt = menu.titre ?? "Menu";
  }

  return clone;
}

function fillExtras(menu) {
  // Stock
  const stockEl = document.getElementById("res-stock");
  if (stockEl) stockEl.textContent = `${menu.quantite_restaurant ?? 0} menus`;

  // Plats (si ton API les renvoie plus tard sous menu.plats)
  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  const entrees = plats.filter(p => normalizeCat(p.categorie) === "entree");
  const platsPrincipaux = plats.filter(p => normalizeCat(p.categorie) === "plat");
  const desserts = plats.filter(p => normalizeCat(p.categorie) === "dessert");

  fillUl("res-entrees", entrees, "Aucune entrée");
  fillUl("res-plats", platsPrincipaux, "Aucun plat");
  fillUl("res-desserts", desserts, "Aucun dessert");

  // Liens allergènes (placeholder)
  bindAllergenLink("res-all-entrees", entrees);
  bindAllergenLink("res-all-plats", platsPrincipaux);
  bindAllergenLink("res-all-desserts", desserts);
}

function setupOrderForm(menu) {
  const form = document.getElementById("reservation-form");
  if (!form) return;

  const checkbox = document.getElementById("conditions");
  const btn = document.getElementById("btn-commandez");

  const dateEl = document.getElementById("datePrestation");
  const timeEl = document.getElementById("heurePrestation");
  const nbEl = document.getElementById("nbPersonnes");

  // si tu as ajouté ces champs, on peut préremplir nb mini
  if (nbEl) {
    const min = menu.nb_personne_mini ?? 1;
    nbEl.min = String(min);
    if (!nbEl.value) nbEl.value = String(min);
  }

  // bouton disabled tant que conditions pas cochées
  const syncBtn = () => {
    if (!btn || !checkbox) return;
    btn.disabled = !checkbox.checked;
  };
  checkbox?.addEventListener("change", syncBtn);
  syncBtn();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Guard connecté
    if (!isConnected()) {
      alert("Pour commander, veuillez vous connecter.");
      const current = window.location.pathname + window.location.search;
      window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
      return;
    }

    // Validation HTML5
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;

    if (!checkbox?.checked) return;

    // Payload minimal (adapte selon ton backend si besoin)
    const payload = {
        menu_id: menu.id,
        nb_personne: Number(document.getElementById("nbPersonnes").value),
        date_prestation: document.getElementById("datePrestation").value,   // "YYYY-MM-DD"
        heure_prestation: document.getElementById("heurePrestation").value, // "HH:mm"
    };

    // UX bouton
    if (btn) {
      btn.disabled = true;
      btn.textContent = "ENVOI…";
    }

    try {
      const token = getToken();

      const res = await fetch(`${apiUrl}commande`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": token,
        },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      const data = safeJson(txt);

      if (!res.ok) {
        console.error("Commande error:", res.status, data || txt);
        alert("Erreur lors de la commande. Vérifie tes infos et réessaie.");
        return;
      }

      alert("Commande enregistrée ✅");
      // Option: redirection
      // window.location.href = "/mes-commandes";
    } catch (err) {
      console.error(err);
      alert("Impossible d’envoyer la commande (réseau/API).");
    } finally {
      if (btn) {
        btn.textContent = "COMMANDEZ";
        syncBtn();
      }
    }
  });
}

async function fetchCurrentUser() {
  const token = getToken();

  const res = await fetch(`${apiUrl}account/me`, {
    headers: {
      "Accept": "application/json",
      "X-AUTH-TOKEN": token,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

function fillClientForm(user) {
  if (!user) return;

  // adapte les champs selon ton JSON user
  document.getElementById("clientNom").value = user.nom ?? "";
  document.getElementById("clientPrenom").value = user.prenom ?? "";
  document.getElementById("clientAdresse").value = user.adresse ?? "";
  document.getElementById("clientTelephone").value = user.telephone ?? "";
}

/* ---------------- utilitaires ---------------- */

function safeJson(txt) {
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

function formatEuro(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value ?? "?"}€`;
  return `${n.toFixed(2)}€`;
}

function normalizeCat(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillUl(id, items, emptyLabel) {
  const ul = document.getElementById(id);
  if (!ul) return;

  ul.innerHTML = "";

  if (!items || items.length === 0) {
    ul.innerHTML = `<li class="text-muted">${escapeHtml(emptyLabel)}</li>`;
    return;
  }

  ul.innerHTML = items
    .map((p) => `<li>${escapeHtml(p.titre ?? p ?? "")}</li>`)
    .join("");
}

function bindAllergenLink(linkId, plats) {
  const a = document.getElementById(linkId);
  if (!a) return;

  a.addEventListener("click", (e) => {
    e.preventDefault();

    // Placeholder: si tu as p.allergenes plus tard
    const alls = [];
    plats.forEach((p) => {
      const list = Array.isArray(p.allergenes) ? p.allergenes : [];
      list.forEach((al) => alls.push(al.libelle ?? al.nom ?? String(al)));
    });

    const unique = [...new Set(alls)].filter(Boolean);

    if (unique.length === 0) {
      alert("Aucun allergène renseigné pour cette catégorie.");
      return;
    }

    alert("Allergènes :\n- " + unique.join("\n- "));
  });
}

initMenuDetail();