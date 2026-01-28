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
["utilisateur"] = utilisateurs enregistrés et connecté
["employe"] = utilisateur ayant le role employé et connecté
["admin"] = utilisateur ayant le role admin et connecté
*/