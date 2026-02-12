export default class Route {
    constructor(url, title, pathHtml, authorize, pathJS  = "") {
      this.url = url;
      this.title = title;
      this.pathHtml = pathHtml;
      this.authorize = authorize;
      this.pathJS = pathJS;
    }
}

/* authorize 
[] = accès public.
["disconnected"] = Visiteurs ou Utilisateurs déconnectés
["ROLE_USER"] = utilisateurs enregistrés et connecté
["ROLE_EMPLOYEE"] = utilisateur ayant le role employé et connecté
["ROLE_ADMIN"] = utilisateur ayant le role admin et connecté
*/