
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listOrPlaceholder(items, emptyLabel = "—") {
  if (!items || items.length === 0) return `<li class="text-muted">${emptyLabel}</li>`;
  return items.map(p => `<li>${escapeHtml(p.titre ?? "")}</li>`).join("");
}


function renderMenu(menu) {

  const template = document.getElementById("menu-template");
  const clone = template.content.cloneNode(true);

  clone.querySelector(".veg-menu__title").textContent = menu.titre;
  clone.querySelector(".veg-menu__subtitle").textContent =
    "Thème " + (menu.theme?.libelle ?? "?");

  clone.querySelector(".veg-menu__desc").textContent =
    menu.description ?? "";

  clone.querySelector(".veg-regime").textContent =
    menu.regime?.libelle ?? "?";

  clone.querySelector(".veg-nb").textContent =
    menu.nb_personne_mini ?? 1;

  clone.querySelector(".veg-prix").textContent =
    (menu.prix_par_personne ?? "?") + "€ / pers";


  clone.querySelector(".menu-stock").textContent =
    (menu.quantite_restaurant ?? 0) + " menus";

  clone.querySelector(".menu-link").href =
    "/reservation.html?id=" + menu.id;

  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  const normalizeCat = (s) =>
    (s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const entrees = plats.filter(p => normalizeCat(p.categorie) === "entree");
  const platsPrincipaux = plats.filter(p => normalizeCat(p.categorie) === "plat");
  const desserts = plats.filter(p => normalizeCat(p.categorie) === "dessert");

  const ulEntrees = clone.querySelector(".menu-entrees");
  const ulPlats = clone.querySelector(".menu-plats");
  const ulDesserts = clone.querySelector(".menu-desserts");

  entrees.forEach(p => ulEntrees.innerHTML += `<li>${p.titre}</li>`);
  platsPrincipaux.forEach(p => ulPlats.innerHTML += `<li>${p.titre}</li>`);
  desserts.forEach(p => ulDesserts.innerHTML += `<li>${p.titre}</li>`);

  if (entrees.length === 0) ulEntrees.innerHTML = `<li class="text-muted">Aucune entrée</li>`;
  if (platsPrincipaux.length === 0) ulPlats.innerHTML = `<li class="text-muted">Aucun plat</li>`;
  if (desserts.length === 0) ulDesserts.innerHTML = `<li class="text-muted">Aucun dessert</li>`;

  return clone;
}


async function loadAllMenus() {
  const container = document.getElementById("menus-container");

  // petit loader
  container.innerHTML = `<p class="text-center my-4">Chargement des menus…</p>`;

  try {
    const res = await fetch(`${apiUrl}menu/all`, {
      headers: { "Accept": "application/json" }
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

    menus.forEach(menu => {
      container.appendChild(renderMenu(menu));
    });
    
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
