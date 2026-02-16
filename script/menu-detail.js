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
      headers: { Accept: "application/json" },
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
  initBootstrapCarousels(container);

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
  const materielEl = clone.querySelector(".veg-menu__materiel");
  if (materielEl) {
    const hasPret = Boolean(menu.pret_materiel);
    if (hasPret) {
      materielEl.classList.remove("d-none");
      materielEl.innerHTML = `<span class="badge rounded-pill text-bg-warning">🎒 Prêt de matériel inclus</span>`;
    } else {
      materielEl.classList.add("d-none");
    }
  }
  // si theme/regime sont IDs -> fallback
  const themeLabel =
    menu.theme?.libelle ?? (menu.theme ? `Thème #${menu.theme}` : "Thème ?");

  const regimeLabel =
    menu.regime?.libelle ?? (menu.regime ? `Régime #${menu.regime}` : "?");

  clone.querySelector(".veg-menu__subtitle").textContent = themeLabel;
  clone.querySelector(".veg-regime").textContent = regimeLabel;

  // meta chiffres
  clone.querySelector(".veg-nb").textContent = menu.nb_personne_mini ?? 1;
  clone.querySelector(".veg-prix").textContent =
    `${formatEuro(menu.prix_par_personne)} / pers`;

  // ✅ Carrousel: photos des plats (plat.photo)
  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  // On cible l'élément racine de la card clonée
  const rootEl = clone.querySelector(".veg-menu") ?? clone.querySelector(".veg-menu-card");
  if (rootEl) {
    fillMenuCarousel(clone, menu, plats);
  }

  return clone;
}

function fillExtras(menu) {
  // Stock
  const stockEl = document.getElementById("res-stock");
  if (stockEl) stockEl.textContent = `${menu.quantite_restaurant ?? 0} menus`;

  const alertBox = document.getElementById("pret-materiel-alert");
  if (alertBox) {
    const hasPret = Boolean(menu.pret_materiel);

    if (hasPret) {
      alertBox.classList.remove("d-none");
      alertBox.innerHTML = `
        <div class="alert alert-warning mt-2 mb-3" role="alert">
          <strong>Restitution du matériel :</strong>
          Le matériel mis à disposition dans le cadre de la prestation demeure la propriété de Vite & Gourmand.\n\
          Il devra être restitué en bon état dans un délai de <strong>10 jours ouvrés suivant la date de prestation.</strong>\n\
          À défaut de restitution dans ce délai, une indemnité forfaitaire de <strong>600€</strong> sera appliquée au client."
        </div>
      `;
    } else {
      alertBox.classList.add("d-none");
      alertBox.innerHTML = "";
    }
  }

  // Plats
  const plats = Array.isArray(menu.plats) ? menu.plats : [];

  const entrees = plats.filter((p) => normalizeCat(p.categorie) === "entree");
  const platsPrincipaux = plats.filter((p) => normalizeCat(p.categorie) === "plat");
  const desserts = plats.filter((p) => normalizeCat(p.categorie) === "dessert");

  fillUl("res-entrees", entrees, "Aucune entrée");
  fillUl("res-plats", platsPrincipaux, "Aucun plat");
  fillUl("res-desserts", desserts, "Aucun dessert");

  bindAllergenLink("res-all-entrees", entrees);
  bindAllergenLink("res-all-plats", platsPrincipaux);
  bindAllergenLink("res-all-desserts", desserts);
}

function setupOrderForm(menu) {

  if (isConnected()) {
    fillClientInfos();
  }

  const form = document.getElementById("reservation-form");
  if (!form) return;

  const checkbox = document.getElementById("conditions");
  const btn = document.getElementById("btn-commandez");

  const nbEl = document.getElementById("nbPersonnes");

  if (nbEl) {
    const min = menu.nb_personne_mini ?? 1;
    nbEl.min = String(min);
    if (!nbEl.value) nbEl.value = String(min);
  }

  const syncBtn = () => {
    if (!btn || !checkbox) return;
    btn.disabled = !checkbox.checked;
  };
  checkbox?.addEventListener("change", syncBtn);
  syncBtn();

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (!isConnected()) {
      alert("Pour commander, veuillez vous connecter.");
      const current = window.location.pathname + window.location.search;
      window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
      return;
    }

    form.classList.add("was-validated");
    if (!form.checkValidity()) return;
    if (!checkbox?.checked) return;

    const payload = {
      menu_id: menu.id,
      adresse_prestation: document.getElementById("clientAdresseLivraison").value,
      nb_personne: Number(document.getElementById("nbPersonnes").value),
      date_prestation: document.getElementById("datePrestation").value,
      heure_prestation: document.getElementById("heurePrestation").value,
    };

    if (btn) {
      btn.disabled = true;
      btn.textContent = "ENVOI…";
    }

    try {
      const token = getToken();

      const res = await fetch(`${apiUrl}commande`, {
        method: "POST",
        headers: {
          Accept: "application/json",
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
    } catch (err) {
      console.error(err);
      alert("Impossible d’envoyer la commande (réseau/API).");
    } finally {
      if (btn) {
        btn.textContent = "COMMANDEZ";
        syncBtn();
      }
    }
  };
}

async function fillClientInfos() {
  try {
    const token = getToken();

    const res = await fetch(`${apiUrl}account/me`, {
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": token,
      },
    });

    if (!res.ok) return;

    const user = await res.json();

    const setIfEmpty = (id, value) => {
      const input = document.getElementById(id);
      if (input && !input.value) {
        input.value = value ?? "";
      }
    };

    setIfEmpty("clientNom", user.nom);
    setIfEmpty("clientPrenom", user.prenom);
    setIfEmpty("clientMail", user.email);
    setIfEmpty("clientAdresseLivraison", user.adresse);
    setIfEmpty("clientTelephone", user.telephone);

  } catch (e) {
    console.error("Erreur récupération user:", e);
  }
}

/* ---------------- CARROUSEL ---------------- */

function resolvePhotoSrc(photoValue, fallback = "/images/placeholder.jpg") {
  const v = (photoValue ?? "").trim();
  if (!v) return fallback;

  const baseUrl = apiUrl.replace(/api\/?$/, "");

  // 1) URL absolue
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // 2) chemins absolus
  // /uploads/... doit venir du back
  if (v.startsWith("/uploads/")) return `${baseUrl}${v.replace(/^\//, "")}`;
  // /images/... reste du front
  if (v.startsWith("/images/")) return v;

  // 3) chemins relatifs
  if (v.startsWith("uploads/")) return `${baseUrl}${v}`;
  if (v.startsWith("images/")) return `/${v}`;

  // 4) sinon => filename stocké en BDD
  return `${baseUrl}uploads/plats/${v}`;
}

function getPlatLabel(p) {
  return p?.titre ?? p?.nom ?? p?.libelle ?? p?.name ?? "Plat";
}

function fillMenuCarousel(rootEl, menu, plats) {
  const carousel = rootEl.querySelector(".veg-carousel");
  if (!carousel) {
    // Si tu n'as pas encore modifié le template HTML, on évite de crash
    const img = rootEl.querySelector(".veg-menu__photo");
    if (img) {
      img.src = "/images/placeholder.jpg";
      img.alt = menu?.titre ?? "Menu";
    }
    return;
  }

  const inner = carousel.querySelector(".veg-carousel__inner");
  const indicators = carousel.querySelector(".veg-carousel__indicators");
  const prevBtn = carousel.querySelector(".carousel-control-prev");
  const nextBtn = carousel.querySelector(".carousel-control-next");

  if (!inner || !indicators) return;

  const items = (plats ?? []).filter((p) => p?.photo);

  const carouselId = `menuDetailCarousel-${menu?.id ?? Math.random().toString(36).slice(2)}`;
  carousel.id = carouselId;

  if (prevBtn) prevBtn.setAttribute("data-bs-target", `#${carouselId}`);
  if (nextBtn) nextBtn.setAttribute("data-bs-target", `#${carouselId}`);

  if (items.length === 0) {
    indicators.innerHTML = "";
    inner.innerHTML = `
      <div class="carousel-item active">
        <img class="d-block w-100 veg-menu__photo" src="/images/placeholder.jpg" alt="Menu">
      </div>
    `;
    if (prevBtn) prevBtn.classList.add("d-none");
    if (nextBtn) nextBtn.classList.add("d-none");
    return;
  }

  // ✅ Slide actif par défaut: le PLAT
  const activeIndex = Math.max(
    items.findIndex((p) => normalizeCat(p.categorie) === "plat"),
    0
  );

  const showNav = items.length >= 2;

  indicators.innerHTML = showNav
    ? items
        .map(
          (_, i) => `
          <button type="button"
            data-bs-target="#${carouselId}"
            data-bs-slide-to="${i}"
            class="${i === activeIndex ? "active" : ""}"
            aria-current="${i === activeIndex ? "true" : "false"}"
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

/* ---------------- utilitaires ---------------- */

function safeJson(txt) {
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
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
    .map((p) => `<li>${escapeHtml(getPlatLabel(p))}</li>`)
    .join("");
}

function bindAllergenLink(linkId, plats) {
  const a = document.getElementById(linkId);
  if (!a) return;

  if (a.dataset.bound === "1") return;
  a.dataset.bound = "1";

  a.addEventListener("click", (e) => {
    e.preventDefault();

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

function initBootstrapCarousels(scope = document) {
  // si Bootstrap JS n'est pas chargé, on ne crash pas
  if (!window.bootstrap?.Carousel) return;

  scope.querySelectorAll(".carousel").forEach((el) => {
    // évite double init
    const existing = window.bootstrap.Carousel.getInstance(el);
    if (existing) existing.dispose();

    new window.bootstrap.Carousel(el, {
      interval: 4000,
      ride: el.dataset.bsRide ? "carousel" : false,
      pause: "hover",
      touch: true,
    });
  });
}

export async function init() {
  await initMenuDetail();
}
