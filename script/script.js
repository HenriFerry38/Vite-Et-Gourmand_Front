const tokenCookieName = "accesstoken";
const roleCookieName = "role";
const signoutBtn = document.getElementById("signoutBtn");
const apiUrl = "http://127.0.0.1:8000/api/";

signoutBtn.addEventListener("click", signout);

function getRole(){
    return getCookie(roleCookieName);
}

function signout(){
    eraseCookie(tokenCookieName);
    eraseCookie(roleCookieName);
    window.location.reload();
}

function setToken(token){
    setCookie(tokenCookieName, token, 7);
}

function getToken(){
    return getCookie(tokenCookieName);
}

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function isConnected(){
    const token = getToken();

    if(token === null || token === undefined || token === ""){
        return false;
    }

    return true;
}

function showAndHideElementsForRoles() {
  const userConnected = isConnected();
  const role = getRole();

  document.querySelectorAll("[data-show]").forEach((el) => {
    const rule = el.dataset.show;

    let hide = false;

    if (rule === "disconnected") hide = userConnected;
    if (rule === "connected") hide = !userConnected;
    if (rule === "admin") hide = !userConnected || role !== "ROLE_ADMIN";
    if (rule === "employee")
      hide = !userConnected || (role !== "ROLE_EMPLOYEE" && role !== "ROLE_ADMIN");
    if (rule === "utilisateur") hide = !userConnected || role !== "ROLE_USER";

    el.classList.toggle("d-none", hide);
  });
}

function hasRole(user, role) {
  return Array.isArray(user?.roles) && user.roles.includes(role);
}

function isSimpleUser(user) {
  // "Mon compte" seulement si user, mais PAS employee/admin
  return hasRole(user, "ROLE_USER")
    && !hasRole(user, "ROLE_EMPLOYEE")
    && !hasRole(user, "ROLE_ADMIN");
}

async function refreshNavByRoles() {
  const linkEmployee = document.querySelector('[data-nav="employee"]');
  const linkAccount = document.querySelector('[data-nav="account"]');

  // reset visuel (sécurité)
  if (linkEmployee) linkEmployee.classList.add("d-none");
  if (linkAccount) linkAccount.classList.add("d-none");

  if (!isConnected()) return;

  try {
    const res = await fetch(`${apiUrl}account/me`, {
      headers: { Accept: "application/json", "X-AUTH-TOKEN": getToken() },
    });
    if (!res.ok) return;

    const me = await res.json();

    const isStaff = hasRole(me, "ROLE_EMPLOYEE") || hasRole(me, "ROLE_ADMIN");

    if (linkEmployee) linkEmployee.classList.toggle("d-none", !isStaff);
    if (linkAccount) linkAccount.classList.toggle("d-none", !isSimpleUser(me));
  } catch (e) {
    console.error("refreshNavByRoles error:", e);
  }
}
document.addEventListener("DOMContentLoaded", async () => {
    showAndHideElementsForRoles();  // gère connecté / pas connecté (simple)
    await refreshNavByRoles();      // gère Mon compte / Employé selon /account/me
});