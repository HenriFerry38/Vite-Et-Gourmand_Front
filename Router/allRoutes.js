import Route from "./route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html"),
    new Route("/menus", "Nos Menus", "/pages/menus.html"),
    new Route("/cgv", "Conditions Générales de Vente", "/pages/cgv.html"),
    new Route("/mentions_legales", "Mentions Légales", "/pages/mentions_legales.html"),
    new Route("/signin", "Connexion", "/pages/auth/signin.html"),
    new Route("/signup", "Inscription", "/pages/auth/signup.html"),
    new Route("/account", "Mon compte", "/pages/auth/account.html"),
    new Route("/editPassword","Modifier son mot de passe", "/pages/auth/editPassword.html"),
    new Route("/historiqueCommande", "Historique des commandes", "/pages/auth/historiqueCommande.html")
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite et Gourmand";