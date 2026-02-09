// /script/auth/auth.js

export function getToken() {
  return localStorage.getItem("token"); // adapte si tu stockes ailleurs
}

export function isConnected() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("token");
}
