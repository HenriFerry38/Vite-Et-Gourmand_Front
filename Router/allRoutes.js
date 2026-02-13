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
    new Route("/account", "Mon compte", "/pages/auth/account.html", ["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/auth/account.js"),
    new Route("/editPassword","Modifier son mot de passe", "/pages/auth/editPassword.html", ["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/auth/editPassword.js"),
    new Route("/historiqueCommande", "Historique des commandes", "/pages/commandes/historiqueCommande.html",["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/auth/historiqueCommande.js"),
    new Route("/editCommande", "Modifier sa commande", "/pages/commandes/editCommande.html",["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/auth/editCommande.js"),
    new Route("/deleteCommande", "Supprimer sa commande", "/pages/commandes/deleteCommande.html",["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/auth/deleteCommande.js"),
    new Route("/reservation", "Reserver son menu", "/pages/commandes/reservation.html",["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/reservation.js"),
    new Route("/menu-detail", "Informations du menu", "/pages/menu-detail.html", ["ROLE_ADMIN", "ROLE_EMPLOYEE", "ROLE_USER"], "/script/menu-detail.js"),
    new Route("/employee", "Dashboard Employee", "/pages/employee/employee.html", ["ROLE_ADMIN","ROLE_EMPLOYEE"], "/script/employee/employee.js" ),
    new Route("/menu-edit","Modifier un Menu", "/pages/employee/menu-edit.html",["ROLE_ADMIN", "ROLE_EMPLOYEE"], "/script/employee/menu-edit.js")
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite et Gourmand";