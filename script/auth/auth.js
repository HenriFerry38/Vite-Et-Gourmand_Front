// /script/auth/auth.js

const TOKEN_KEY = "token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY); 
}

export function setToken(token) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token); 
}

export function isConnected() {
  return !!getToken();
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  
  try {
    if (typeof setCookie === "function") {
      setCookie(roleCookieName, "", -1);
    }
  } catch {}
}
