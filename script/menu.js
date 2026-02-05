// ../script/menu.js

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&lt;")
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
    .map((p) => `<li>${escapeHtml(p.titre ?? p.nom ?? p.libelle ?? String(p))}</li>`)
    .join("");
}

function extractAllergens(plats) {
  const set = new Set();

  plats.forEach((p) => {
    const list = Array.isArray(p.allergenes) ? p.allergenes : [];
    list.forEach((al) => {
      const label =
        al?.libelle ??
        al?.nom ??
        al?.name ??
        (typeof al === "string" ? al : "");
      if (label) set.add(label);
    });
  });

  return [...set];
}

// ✅ ton champ s'appelle "photo"
function resolvePhotoSrc(photoValue, fallback = "/images/placeholder.jpg") {
  const v = (photoValue ?? "").trim();
  if (!v) return fallback;

  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  if (v.startsWith("/images/")) return v;
  if (v.startsWith("images/")) return `/${v}`;
  if (v.startsWith("/")) return v;

  return `/images/${v}`;
}

function getPlatLabel(p) {
  // ton API semble renvoyer titre (nom undefined)
  return p?.titre ?? p?.nom ?? p?.libelle ?? p?.name ?? "Plat";
}

/**
 * Remplit le carrousel présent dans le template.
 * - un slide par plat (plat.photo)
 * - ajoute un ID unique + data-bs-target sur boutons/indicators
 */
function fillMenuCarousel(clone, menu, plats) {
  const carousel = clone.querySelector(".veg-carousel");
  if (!carousel) return;

  const inner = carousel.querySelector(".veg-carousel__inner");
  const indicators = carousel.querySelector(".veg-carousel__indicators");
  const prevBtn = carousel.querySelector(".carousel-control-prev");
  const nextBtn = carousel.querySelector(".carousel-control-next");

  if (!inner || !indicators) return;

  // plats avec photo
  const items = (plats ?? []).filter((p) => p?.photo);
  const activeIndex = Math.max(
    items.findIndex((p) => normalizeCat(p.categorie) === "plat"),
    0
  );

  // ID unique pour Bootstrap
  const carouselId = `menuCarousel-${menu?.id ?? Math.random().toString(36).slice(2)}`;
  carousel.id = carouselId;

  // relier boutons au carrousel
  if (prevBtn) prevBtn.setAttribute("data-bs-target", `#${carouselId}`);
  if (nextBtn) nextBtn.setAttribute("data-bs-target", `#${carouselId}`);

  // si pas de photos => on garde le fallback placeholder (déjà dans le HTML)
  if (items.length === 0) {
    indicators.innerHTML = "";
    // cacher les controls si 0/1 slide
    if (prevBtn) prevBtn.classList.add("d-none");
    if (nextBtn) nextBtn.classList.add("d-none");
    return;
  }

  // si 1 seule photo: pas besoin d'indicators + controls
  const showNav = items.length >= 2;

  indicators.innerHTML = showNav
    ? items
        .map(
          (_, i) => `
          <button type="button"
            data-bs-target="#${carouselId}"
            data-bs-slide-to="${i}"
            class="${i === 0 ? "active" : ""}"
            aria-current="${i === 0 ? "true" : "false"}"
            aria-label="Slide ${i + 1}">
          </button>
        `
        )
        .join("")
    : "";

  inner.innerHTML = items
    .map((p, i) => {
      const label = getPlatLabel(p);
      const src = resolvePhotoSrc(p.photo);

      return `
        <div class="carousel-item ${i === activeIndex ? "active" : ""}">
          <img
            class="d-block w-100 veg-menu__photo"
            src="${src}"
            alt="${escapeHtml(label)}"
            onerror="this.onerror=null;this.src='/images/placeholder.jpg';"
          />
          <div class="carousel-caption d-block">
            <div class="px-2 py-1 rounded"
                 style="background: rgba(0,0,0,.45); display:inline-block;">
              ${escapeHtml(label)}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  if (prevBtn) prevBtn.classList.toggle("d-none", !showNav);
  if (nextBtn) nextBtn.classList.toggle("d-none", !showNav);
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

  // ✅ plats
  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  // ✅ Carrousel (plat.photo + titre)
  fillMenuCarousel(clone, menu, plats);

  const entrees = plats.filter((p) => normalizeCat(p.categorie) === "entree");
  const platsPrincipaux = plats.filter((p) => normalizeCat(p.categorie) === "plat");
  const desserts = plats.filter((p) => normalizeCat(p.categorie) === "dessert");

  // ✅ lien menu-detail (public)
  const link = clone.querySelector(".menu-link");
  if (link) {
    link.href = `/menu-detail?id=${encodeURIComponent(menu.id)}`;
    link.textContent = "Réserver ce menu";

    link.addEventListener("click", (e) => {
      if (!isConnected()) {
        e.preventDefault();
        alert("Pour réserver, veuillez vous connecter.");
        const target = `/menu-detail?id=${menu.id}`;
        window.location.href = `/signin?redirect=${encodeURIComponent(target)}`;
        return;
      }
      if (typeof route === "function") route(e);
    });
  }

  // ✅ détails (wrapper)
  const detailsWrap = clone.querySelector(".menu-details-wrapper");
  const btnDetails = clone.querySelector(".menu-toggle-details");

  if (btnDetails && detailsWrap) {
    btnDetails.addEventListener("click", () => {
      const open = detailsWrap.classList.contains("d-none");
      detailsWrap.classList.toggle("d-none", !open);
      btnDetails.textContent = open ? "Masquer les détails" : "Voir les détails";
    });

    fillUlNode(clone.querySelector(".menu-details-entrees"), entrees, "Aucune entrée");
    fillUlNode(clone.querySelector(".menu-details-plats"), platsPrincipaux, "Aucun plat");
    fillUlNode(clone.querySelector(".menu-details-desserts"), desserts, "Aucun dessert");

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
