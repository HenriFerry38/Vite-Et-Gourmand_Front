import Route from "./route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html"),
    new Route("/galerie", "La galerie", "/pages/galerie.html")
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite et Gourmand";