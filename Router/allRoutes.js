import Route from "./route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html"),
    new Route("/menus", "Nos Menus", "/pages/menus.html"),
    new Route("/cgv", "Conditions Générales de Vente", "/pages/cgv.html"),
    new Route("/mentions_legales", "Mentions Légales", "/pages/mentions_legales.html")
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite et Gourmand";