const API = "https://vite-et-gourmand-api-dep-103e633b85d5.herokuapp.com/api";
const ENDPOINT_ME = `${API}/account/me`;

function $(id) {
  return document.getElementById(id);
}

function authHeaders() {
  const token = window.getToken?.();
  return {
    "Content-Type": "application/json",
    "X-AUTH-TOKEN": token,
  };
}

function showAlert(message, type = "info") {
  const el = $("account-alert");
  if (!el) return;
  el.className = `alert alert-${type} mt-3 fade show`;
  el.textContent = message;
  el.style.display = "block";
}

function hideAlert() {
  const el = $("account-alert");
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
  const form = $("account-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      await updateMe();
    });
  }

  const btnDelete = $("btn-delete-account");
  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      hideAlert();
      await confirmAndDeleteAccount();
    });
  }
}

async function loadMe() {
  const res = await fetch(ENDPOINT_ME, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Erreur chargement profil (${res.status})`);
  }

  $("NomInput").value = data.nom ?? "";
  $("PrenomInput").value = data.prenom ?? "";
  $("TelephoneInput").value = data.telephone ?? "";
  $("AdresseInput").value = data.adresse ?? "";
  $("VilleInput").value = data.ville ?? "";
  $("CodePostalInput").value = data.codePostal ?? "";
  $("PaysInput").value = data.pays ?? "";
}

async function updateMe() {
  const payload = {
    nom: $("NomInput")?.value?.trim() ?? "",
    prenom: $("PrenomInput")?.value?.trim() ?? "",
    telephone: $("TelephoneInput")?.value?.trim() ?? "",
    adresse: $("AdresseInput")?.value?.trim() ?? "",
    code_postal: $("CodePostalInput")?.value?.trim() ?? "",
    ville: $("VilleInput")?.value?.trim() ?? "",
    pays: $("PaysInput")?.value?.trim() ?? "",
  };

  if (!payload.nom || !payload.prenom) {
    showAlert("Nom et prénom sont requis.", "warning");
    return;
  }

  const res = await fetch(ENDPOINT_ME, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || `Erreur mise à jour (${res.status})`);
  }
  // 👇 ICI on ajoute l'alerte succès
  showAlert("✔️ Vos informations ont bien été mises à jour.", "success");

  // 👇 Optionnel : disparition automatique après 4 secondes
  setTimeout(() => {
    hideAlert();
  }, 4000);
}


async function confirmAndDeleteAccount() {
  const ok = window.confirm(
    "⚠️ Supprimer votre compte est définitif.\n\nSouhaitez-vous continuer ?"
  );
  if (!ok) return;

  const typed = window.prompt('Tape "SUPPRIMER" pour confirmer :');
  if (typed !== "SUPPRIMER") {
    showAlert("Suppression annulée.", "info");
    return;
  }

  const res = await fetch(ENDPOINT_ME, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Erreur suppression (${res.status})`);
  }

  showAlert("Compte supprimé. Déconnexion…", "success");

  // utilise ton signout existant
  if (typeof window.signout === "function") {
    window.signout();
  } else {
    // fallback
    window.location.href = "/";
  }
}

export async function init() {
  console.log("✅ account.js chargé (module)");

  // Guard UX
  if (!window.isConnected || !window.isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  bindEvents();

  try {
    await loadMe();
    showAlert("Informations chargées ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Impossible de charger vos informations.", "danger");
  }
}
