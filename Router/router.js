import Route from "./route.js";
import { allRoutes, websiteName } from "./allRoutes.js";

// Route 404
const route404 = new Route("404", "Page introuvable", "/pages/404.html", []);

/* ---------------- LOADER ---------------- */

const showLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) loader.classList.remove("is-hidden");
};

const hideLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) loader.classList.add("is-hidden");
};

/* ---------------- ROUTES ---------------- */

const getRouteByUrl = (url) => allRoutes.find((r) => r.url === url) ?? route404;

/* ---------------- AUTH HELPERS ---------------- */

// Récupère les rôles depuis /api/account/me (source de vérité)
async function fetchRolesFromMe() {
  if (typeof isConnected !== "function" || !isConnected()) return [];

  try {
    const res = await fetch(`${apiUrl}account/me`, {
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
    });

    if (!res.ok) return [];

    const me = await res.json();
    return Array.isArray(me.roles) ? me.roles : [];
  } catch (e) {
    console.error("fetchRolesFromMe error:", e);
    return [];
  }
}

// Autorisation d'accès à une route
async function isAuthorized(authorizeList) {
  // Route publique
  if (!Array.isArray(authorizeList) || authorizeList.length === 0) return true;

  // Route réservée aux visiteurs non connectés
  if (authorizeList.includes("disconnected")) {
    return typeof isConnected === "function" ? !isConnected() : true;
  }

  // Route protégée -> doit être connecté
  if (typeof isConnected !== "function" || !isConnected()) return false;

  // Si authorize contient des rôles (ROLE_*)
  const roles = await fetchRolesFromMe();
  return roles.some((r) => authorizeList.includes(r));
}

/* ---------------- LOAD PAGE ---------------- */

const LoadContentPage = async () => {
  showLoader();

  try {
    const path = window.location.pathname;
    const actualRoute = getRouteByUrl(path);
    console.log("[router] path =", path);
    console.log("[router] route =", actualRoute);

    // Guard accès
    const ok = await isAuthorized(actualRoute.authorize);
    if (!ok) {
      window.location.replace("/");
      return;
    }

    // Charger HTML
    const response = await fetch(actualRoute.pathHtml);
    const main = document.getElementById("main-page");
    if (!main) return;

    if (!response.ok) {
      const fallback = await fetch(route404.pathHtml);
      main.innerHTML = await fallback.text();
    } else {
      main.innerHTML = await response.text();
    }

    // Script spécifique (editCommande)
    if (window.location.pathname === "/editCommande") {
      const mod = await import("/script/commandeHoraire.js");
      if (mod?.initCommandeHoraire) mod.initCommandeHoraire();
    }

    // JS de page
    if (actualRoute.pathJS) {
      try {
        const moduleUrl = new URL(actualRoute.pathJS, window.location.origin).href;
        console.log("Importing page module:", moduleUrl);

        const mod = await import(moduleUrl);
        if (mod && typeof mod.init === "function") {
          await mod.init();
        }
      } catch (e) {
        console.error("Erreur chargement module JS:", actualRoute.pathJS, e);
      }
    }

    // Title
    document.title = `${actualRoute.title} - ${websiteName}`;

    // Afficher/masquer UI selon connexion + refresh lien employé
    // (showAndHideElementsForRoles gère surtout connected/disconnected chez toi)
    try {
      if (typeof showAndHideElementsForRoles === "function") {
        await Promise.resolve(showAndHideElementsForRoles());
      }
      if (typeof refreshNavByRoles === "function") {
        await Promise.resolve(refreshNavByRoles());
      }
    } catch (e) {
      console.error("UI role/nav refresh error:", e);
    }
  } catch (error) {
    console.error("Erreur lors du chargement de la page :", error);

    // fallback 404
    try {
      const main = document.getElementById("main-page");
      if (!main) return;
      const fallback = await fetch(route404.pathHtml);
      main.innerHTML = await fallback.text();
    } catch {}
  } finally {
    hideLoader();
  }
};

/* ---------------- NAV EVENTS ---------------- */

const routeEvent = (event) => {
  event = event || window.event;
  event.preventDefault();

  const href = event.currentTarget.getAttribute("href");
  window.history.pushState({}, "", href);
  LoadContentPage();
};

window.onpopstate = LoadContentPage;
window.route = routeEvent;
LoadContentPage();
