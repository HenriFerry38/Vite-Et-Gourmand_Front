
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
    const plats = Array.isArray(menu.plats) ? menu.plats : [];

    const normalizeCat = (s) =>
        (s ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
  
    const entrees = plats.filter(p => normalizeCat(p.categorie) === "entree");
    const platsPrincipaux = plats.filter(p => normalizeCat(p.categorie) === "plat");
    const desserts = plats.filter(p => normalizeCat(p.categorie) === "dessert");

    return `
    <div class="card veg-menu-card border-0 shadow-lg mb-4">
        <div class="card-body p-2 p-sm-3">

        <article class="veg-menu">

            <!-- Top -->
            <div class="veg-menu__top p-3">
            <div class="d-flex justify-content-between gap-3">
                <div>
                <h3 class="veg-menu__title mb-1">${escapeHtml(menu.titre)}</h3>
                <div class="veg-menu__subtitle">Thème ${escapeHtml(menu.theme?.libelle ?? "?")}</div>
                </div>

                <p class="veg-menu__desc mb-0">
                ${escapeHtml(menu.description ?? "")}
                </p>
            </div>
            </div>

            <!-- Image -->
            <div class="veg-menu__media position-relative mx-3">
            <div class="veg-menu__img">
                <img src="../images/placeholder.jpg" alt="${escapeHtml(menu.titre)}">
            </div>

            <button class="veg-menu__arrow veg-menu__arrow--left" type="button">‹</button>
            <button class="veg-menu__arrow veg-menu__arrow--right" type="button">›</button>

            <div class="veg-menu__label">${escapeHtml(menu.titre)}</div>
            </div>

            <!-- Meta -->
            <div class="veg-menu__meta px-3 pt-2">
            <div class="row g-2">
                <div class="col-4">
                <div class="veg-pill text-center">
                    <div class="veg-pill__k">Régime :</div>
                    <div class="veg-pill__v">${escapeHtml(menu.regime?.libelle ?? "?")}</div>
                </div>
                </div>
                <div class="col-4">
                <div class="veg-pill text-center">
                    <div class="veg-pill__k">Nb pers. mini :</div>
                    <div class="veg-pill__v">${menu.nb_personne_mini ?? 1}</div>
                </div>
                </div>
                <div class="col-4">
                <div class="veg-pill text-center">
                    <div class="veg-pill__k">Prix mini :</div>
                    <div class="veg-pill__v">${menu.prix_par_personne ?? "?"}€ / pers</div>
                </div>
                </div>
            </div>
            </div>

            <!-- Liste des plats -->
            <div class="veg-menu__list mx-3 mt-2 p-3">
            <h4 class="veg-menu__listTitle mb-2">Liste des plats</h4>

            <div class="row g-2">
                <div class="col-4">
                <div class="veg-box">
                    <div class="veg-box__title">Entrée(s)</div>
                    <ul class="veg-box__items">
                    ${listOrPlaceholder(entrees, "Aucune entrée")}
                    </ul>
                </div>
                </div>

                <div class="col-4">
                <div class="veg-box">
                    <div class="veg-box__title">Plat(s)</div>
                    <ul class="veg-box__items">
                    ${listOrPlaceholder(platsPrincipaux, "Aucun plat")}
                    </ul>
                </div>
                </div>

                <div class="col-4">
                <div class="veg-box">
                    <div class="veg-box__title">Dessert(s)</div>
                    <ul class="veg-box__items">
                    ${listOrPlaceholder(desserts, "Aucun dessert")}
                    </ul>
                </div>
                </div>
            </div>
            </div>

            <!-- Bottom -->
            <div class="veg-menu__bottom d-flex align-items-center justify-content-between gap-2 px-3 pt-2 pb-3">
            <a href="/reservation.html?id=${menu.id}" class="btn veg-btn w-100">Réservez votre menu</a>

            <div class="veg-stock">
                <span class="veg-stock__label">Stock :</span>
                <span class="veg-stock__badge">${menu.quantite_restaurant ?? 0} menus</span>
            </div>
            </div>

        </article>

        </div>
    </div>
    `;
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

    container.innerHTML = menus.map(renderMenu).join("");

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
