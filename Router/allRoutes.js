import Route from "./route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", []),
    new Route("/menus", "Nos Menus", "/pages/menus.html",[], "/script/menu.js" ),
    new Route("/cgv", "Conditions Générales de Vente", "/pages/cgv.html",[]),
    new Route("/mentions_legales", "Mentions Légales", "/pages/mentions_legales.html",[]),
    new Route("/contacts", "Contacts", "/pages/contacts.html",[]),
    new Route("/signin", "Connexion", "/pages/auth/signin.html", ["disconnected"], "/script/auth/signin.js"),
    new Route("/signup", "Inscription", "/pages/auth/signup.html", ["disconnected"], "/script/auth/signup.js"),
    new Route("/account", "Mon compte", "/pages/auth/account.html", ["admin", "employe", "utilisateur"]),
    new Route("/editPassword","Modifier son mot de passe", "/pages/auth/editPassword.html", ["admin", "employe", "utilisateur"]),
    new Route("/historiqueCommande", "Historique des commandes", "/pages/commandes/historiqueCommande.html",["admin", "employe", "utilisateur"]),
    new Route("/editCommande", "Modifier sa commande", "/pages/commandes/editCommande.html",["utilisateur"]),
    new Route("/deleteCommande", "Supprimer sa commande", "/pages/commandes/deleteCommande.html",["utilisateur"])
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite et Gourmand";