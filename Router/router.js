import Route from "./route.js";
import { allRoutes, websiteName } from "./allRoutes.js";

// Création d'une route pour la page 404 (page introuvable)
const route404 = new Route("404", "Page introuvable", "/pages/404.html", []);

// --- LOADER ---
const showLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) loader.classList.remove("is-hidden");
};

const hideLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) loader.classList.add("is-hidden");
};

// Fonction pour récupérer la route correspondant à une URL donnée
const getRouteByUrl = (url) => {
  let currentRoute = null;
  // Parcours de toutes les routes pour trouver la correspondance
  allRoutes.forEach((element) => {
    if (element.url == url) {
      currentRoute = element;
    }
  });
  // Si aucune correspondance n'est trouvée, on retourne la route 404
  if (currentRoute != null) {
    return currentRoute;
  } else {
    return route404;
  }
};

// Fonction pour charger le contenu de la page
const LoadContentPage = async () => {
  showLoader();

  try {
    const path = window.location.pathname;
    const actualRoute = getRouteByUrl(path);

    // Vérifications des droits d'accès à la page
    const allRolesArray = actualRoute.authorize;

    if (allRolesArray.length > 0) {
      if (allRolesArray.includes("disconnected")) {
        if (isConnected()) {
          hideLoader(); 
          window.location.replace("/");
          return;
        }
      } else {
        const roleUser = getRole();
        if (!allRolesArray.includes(roleUser)) {
          hideLoader(); 
          window.location.replace("/");
          return;
        }
      }
    }

    const response = await fetch(actualRoute.pathHtml);

    // Si le fichier HTML n'existe pas / erreur serveur → 404
    if (!response.ok) {
      const fallback = await fetch(route404.pathHtml);
      document.getElementById("main-page").innerHTML = await fallback.text();
    } else {
      const html = await response.text();
      document.getElementById("main-page").innerHTML = html;
    }
    //Insertion du script horaire pour la modification de commande
    if (window.location.pathname === "/editCommande") {
      const mod = await import("/script/commandeHoraire.js");
      mod.initCommandeHoraire();
    }

    // Ajout du JS de page
    if (actualRoute.pathJS != "") {
      try {
        const mod = await import(actualRoute.pathJS);

        // Si le module expose une init(), on l'appelle (propre)
        if (mod && typeof mod.init === "function") {
          await mod.init();
        }
      } catch (e) {
        console.error("Erreur chargement module JS:", actualRoute.pathJS, e);
      }
    }

    document.title = actualRoute.title + " - " + websiteName;

    // Afficher / masquer éléments selon les rôles
    await Promise.resolve(showAndHideElementsForRoles());

  } catch (error) {
    console.error("Erreur lors du chargement de la page :", error);

    // afficher la 404 si crash
    try {
      const fallback = await fetch(route404.pathHtml);
      document.getElementById("main-page").innerHTML = await fallback.text();
    } catch (e) {
      // si même la 404 échoue, au moins on évite de bloquer
    }
  } finally {
    // on enlève le loader
    hideLoader();
  }
};

// Fonction pour gérer les événements de routage (clic sur les liens)
const routeEvent = (event) => {
  event = event || window.event;
  event.preventDefault();
  // Mise à jour de l'URL dans l'historique du navigateur
  const href = event.currentTarget.getAttribute("href");
  window.history.pushState({}, "", href);
  // Chargement du contenu de la nouvelle page
  LoadContentPage();
};

// Gestion de l'événement de retour en arrière dans l'historique du navigateur
window.onpopstate = LoadContentPage;
// Assignation de la fonction routeEvent à la propriété route de la fenêtre
window.route = routeEvent;
// Chargement du contenu de la page au chargement initial
LoadContentPage();


