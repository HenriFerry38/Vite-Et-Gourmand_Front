const API = "http://127.0.0.1:8000/api";
const ENDPOINT_ME = `${API}/account/me`;

function $(id) {
  return document.getElementById(id);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-AUTH-TOKEN": window.getToken?.(),
  };
}

function showAlert(message, type = "info") {
  const el = $("editPassword-alert");
  if (!el) return;
  el.className = `alert alert-${type} mt-3`;
  el.textContent = message;
  el.style.display = "block";
}

function hideAlert() {
  const el = $("editPassword-alert");
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

function bindEvents() {
  const form = $("editPassword-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    await changePassword();
  });
}

async function changePassword() {
  const oldPwd = $("OldPasswordInput")?.value ?? "";
  const newPwd = $("PasswordInput")?.value ?? "";
  const confirmPwd = $("ValidatePasswordInput")?.value ?? "";

  // UX: on garde l'ancien champ pour l'utilisateur,
  // mais côté API actuelle il n'est pas vérifié.
  if (!oldPwd.trim()) {
    showAlert("Veuillez renseigner votre ancien mot de passe.", "warning");
    return;
  }

  if (newPwd.trim().length < 8) {
    showAlert("Le nouveau mot de passe doit faire au moins 8 caractères.", "warning");
    return;
  }

  if (newPwd !== confirmPwd) {
    showAlert("La confirmation ne correspond pas au nouveau mot de passe.", "warning");
    return;
  }

  const res = await fetch(ENDPOINT_ME, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ password: newPwd }),
  });

  // PUT renvoie 204, donc pas forcément de JSON
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || `Erreur changement mot de passe (${res.status})`);
  }

  showAlert("✔️ Mot de passe mis à jour avec succès.", "success");

  // Optionnel: reset des champs
  $("OldPasswordInput").value = "";
  $("PasswordInput").value = "";
  $("ValidatePasswordInput").value = "";

  // Optionnel: redirect après 2s
  setTimeout(() => {
    window.location.href = "/account";
  }, 2000);
}

export async function init() {
  console.log("✅ editPassword.js chargé");

  // Guard UX
  if (!window.isConnected || !window.isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  bindEvents();
}
