// ../script/menu.js
// Requiert: apiUrl (dans ton script global). route(event) optionnel si tu utilises ton SPA.

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function fillUlNode(ul, items, emptyLabel) {
  if (!ul) return;

  ul.innerHTML = "";

  if (!items || items.length === 0) {
    ul.innerHTML = `<li class="text-muted">${escapeHtml(emptyLabel)}</li>`;
    return;
  }

  ul.innerHTML = items
    .map((p) => `<li>${escapeHtml(p.titre ?? p.nom ?? String(p))}</li>`)
    .join("");
}

function extractAllergens(plats) {
  const set = new Set();

  plats.forEach((p) => {
    const list = Array.isArray(p.allergenes) ? p.allergenes : [];
    list.forEach((al) => {
      const label = al?.libelle ?? al?.nom ?? al?.name ?? (typeof al === "string" ? al : "");
      if (label) set.add(label);
    });
  });

  return [...set];
}

function renderMenu(menu) {
  const template = document.getElementById("menu-template");
  const clone = template.content.cloneNode(true);

  // ✅ champs principaux
  clone.querySelector(".veg-menu__title").textContent = menu.titre ?? "Menu";
  clone.querySelector(".veg-menu__subtitle").textContent = menu.theme?.libelle ?? "?";
  clone.querySelector(".veg-menu__desc").textContent = menu.description ?? "";

  clone.querySelector(".veg-regime").textContent = menu.regime?.libelle ?? "?";
  clone.querySelector(".veg-nb").textContent = menu.nb_personne_mini ?? 1;
  clone.querySelector(".veg-prix").textContent = `${formatEuro(menu.prix_par_personne)} / pers`;

  clone.querySelector(".menu-stock").textContent = `${menu.quantite_restaurant ?? 0} menus`;

  // ✅ lien menu-detail (public)
  const link = clone.querySelector(".menu-link");
  if (link) {
    link.href = `/menu-detail?id=${encodeURIComponent(menu.id)}`;

    link.textContent = "Réserver ce menu"; // (recommandé)
    
    link.addEventListener("click", (e) => {
      // ✅ Guard: pas connecté => signin + redirect
      if (!isConnected()) {
        e.preventDefault();
        alert("Pour réserver, veuillez vous connecter.");
        const target = `/menu-detail?id=${menu.id}`;
        window.location.href = `/signin?redirect=${encodeURIComponent(target)}`;
        return;
      }

      // ✅ connecté => navigation SPA normale
      if (typeof route === "function") route(e);
    });
  }

  // ✅ plats
  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  const entrees = plats.filter((p) => normalizeCat(p.categorie) === "entree");
  const platsPrincipaux = plats.filter((p) => normalizeCat(p.categorie) === "plat");
  const desserts = plats.filter((p) => normalizeCat(p.categorie) === "dessert");

  // aperçu dans la card
  fillUlNode(clone.querySelector(".menu-entrees"), entrees, "Aucune entrée");
  fillUlNode(clone.querySelector(".menu-plats"), platsPrincipaux, "Aucun plat");
  fillUlNode(clone.querySelector(".menu-desserts"), desserts, "Aucun dessert");

  // ✅ détails (wrapper)
  const detailsWrap = clone.querySelector(".menu-details-wrapper");
  const btnDetails = clone.querySelector(".menu-toggle-details");

  if (btnDetails && detailsWrap) {
    btnDetails.addEventListener("click", () => {
      const open = detailsWrap.classList.contains("d-none");
      detailsWrap.classList.toggle("d-none", !open);
      btnDetails.textContent = open ? "Masquer les détails" : "Voir les détails";
    });

    // listes détails
    fillUlNode(clone.querySelector(".menu-details-entrees"), entrees, "Aucune entrée");
    fillUlNode(clone.querySelector(".menu-details-plats"), platsPrincipaux, "Aucun plat");
    fillUlNode(clone.querySelector(".menu-details-desserts"), desserts, "Aucun dessert");

    // allergènes via tes liens .menu-allergen-link (data-type)
    clone.querySelectorAll(".menu-allergen-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();

        const type = a.dataset.type;
        let listPlats = [];
        if (type === "entrees") listPlats = entrees;
        if (type === "plats") listPlats = platsPrincipaux;
        if (type === "desserts") listPlats = desserts;

        const allergens = extractAllergens(listPlats);

        if (allergens.length === 0) {
          alert("Aucun allergène renseigné pour cette catégorie.");
          return;
        }

        alert("Allergènes :\n- " + allergens.join("\n- "));
      });
    });

    // ✅ conditions (API si dispo, sinon fallback)
    const defaultRes = [
      "Pensez à réserver ce menu au minimum 48h à l’avance.",
      "Aucun retour de matériel prévu sur ce menu.",
      "Vérifier les risques d’allergies avant toute commande.",
    ];
    const defaultSto = [
      "Si vous avez des restes, conservez au frais et consommez rapidement (24h à 48h max).",
    ];

    const condRes = clone.querySelector(".menu-conditions-reservation");
    const condSto = clone.querySelector(".menu-conditions-stockage");

    const listRes = Array.isArray(menu.conditions_reservation)
      ? menu.conditions_reservation
      : defaultRes;

    const listSto = Array.isArray(menu.conditions_stockage)
      ? menu.conditions_stockage
      : defaultSto;

    fillUlNode(condRes, listRes, "—");
    fillUlNode(condSto, listSto, "—");
  }

  return clone;
}

async function loadAllMenus() {
  const container = document.getElementById("menus-container");
  if (!container) return;

  container.innerHTML = `<p class="text-center my-4">Chargement des menus…</p>`;

  try {
    const res = await fetch(`${apiUrl}menu/all`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Erreur API (${res.status}) ${txt}`);
    }

    const menus = await res.json();

    if (!Array.isArray(menus) || menus.length === 0) {
      container.innerHTML = `<p class="text-center my-4">Aucun menu disponible.</p>`;
      return;
    }

    container.innerHTML = "";
    menus.forEach((menu) => container.appendChild(renderMenu(menu)));
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <p class="text-danger text-center my-4">
        Impossible de charger les menus.
      </p>
    `;
  }
}

loadAllMenus();
