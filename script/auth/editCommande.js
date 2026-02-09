// /script/commandes/editCommande.js
const API = "http://127.0.0.1:8000/api";

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
  const el = $("editCommande-alert");
  if (!el) return;
  el.className = `alert alert-${type} mt-3`;
  el.textContent = message;
  el.style.display = "block";
}

function hideAlert() {
  const el = $("editCommande-alert");
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

function getCommandeId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("commandeId") || url.searchParams.get("id");
}

function isoToDateInput(iso) {
  // "2026-04-16T00:00:00+02:00" -> "2026-04-16"
  if (!iso) return "";
  return String(iso).slice(0, 10);
}

function isoToHourMinute(iso) {
  // "1970-01-01T20:20:00+01:00" -> "20:20"
  if (!iso) return "";
  const s = String(iso);
  const tIndex = s.indexOf("T");
  if (tIndex === -1) return "";
  return s.slice(tIndex + 1, tIndex + 6);
}

function decideServiceFromHour(hhmm) {
  const [h] = (hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "soir";
  return h < 16 ? "matin" : "soir";
}

function setServiceRadio(service) {
  const matin = $("matinRadio");
  const soir = $("soirRadio");
  if (!matin || !soir) return;

  matin.checked = service === "matin";
  soir.checked = service !== "matin";

  // important: ton commandeHoraire.js remplit le select sur "change"
  const evt = new Event("change", { bubbles: true });
  (service === "matin" ? matin : soir).dispatchEvent(evt);
}

function setSelectHourValue(targetHHMM) {
  const select = $("selectHour");
  if (!select) return;

  const trySet = () => {
    const exists = [...select.options].some((o) => o.value === targetHHMM);
    if (exists) {
      select.value = targetHHMM;
      return true;
    }
    return false;
  };

  if (trySet()) return;

  // attendre que commandeHoraire.js injecte les options
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (trySet() || attempts > 30) clearInterval(timer);
  }, 100);
}

function renderMenu(menu) {
  const box = $("menu-info");
  if (!box) return;

  if (!menu) {
    box.innerHTML = `<div class="text-muted">Menu indisponible.</div>`;
    return;
  }

  const titre = menu.titre ?? "Menu";
  const desc = menu.description ?? "";
  const prix = menu.prix_par_personne ?? menu.prixParPersonne ?? null;
  const mini = menu.nb_personne_mini ?? menu.nbPersonneMini ?? null;

  box.innerHTML = `
    <div class="card rounded-4 shadow-sm mb-3">
      <div class="card-body">
        <h5 class="card-title mb-1">${titre}</h5>
        ${desc ? `<p class="mb-2 text-muted">${desc}</p>` : ""}
        <div class="d-flex flex-wrap gap-3">
          ${prix !== null ? `<div>Prix/pers: <strong>${prix} €</strong></div>` : ""}
          ${mini !== null ? `<div>Min: <strong>${mini}</strong></div>` : ""}
        </div>
      </div>
    </div>
  `;
}

async function fetchCommande(id) {
  const res = await fetch(`${API}/commande/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.detail || `Erreur chargement commande (${res.status})`);
  }
  return data;
}

function prefillForm(commande) {
  // mapping direct de TON JSON
  $("AdresseInput").value = commande.adressePrestation ?? "";
  $("NbPersonneInput").value = commande.nbPersonne ?? "";
  $("DateInput").value = isoToDateInput(commande.datePrestation);

  const hhmm = isoToHourMinute(commande.heurePrestation);
  const service = decideServiceFromHour(hhmm || "19:00");
  setServiceRadio(service);
  setSelectHourValue(hhmm);
}

async function updateCommande(id, commande) {
  const adresse = $("AdresseInput")?.value?.trim() ?? "";
  const nb = Number($("NbPersonneInput")?.value ?? 0);
  const date = $("DateInput")?.value?.trim() ?? "";
  const heure = $("selectHour")?.value?.trim() ?? "";

  if (!adresse) return showAlert("Adresse de livraison requise.", "warning");
  if (!nb || nb <= 0) return showAlert("Nombre de personnes invalide.", "warning");
  if (!date) return showAlert("Date de prestation requise.", "warning");
  if (!heure) return showAlert("Heure de prestation requise.", "warning");

  // Ton back attend probablement les mêmes champs que ta création de commande
  // IMPORTANT: on conserve le menu existant
  const menuId =
    commande.menu?.id ??
    commande.menu_id ??
    commande.menuId ??
    null;

  if (!menuId) return showAlert("Impossible d’identifier le menu de la commande.", "danger");

  const payload = {
    menu_id: menuId,
    nb_personne: nb,
    date_prestation: date,
    heure_prestation: heure,           // "20:20"
    adresse_prestation: adresse,
  };

  const res = await fetch(`${API}/commande/${id}`, {
    method: "PUT", // change en PATCH si ton endpoint est en PATCH
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.detail || `Erreur modification (${res.status})`);
  }
}

function bindForm(onSubmit) {
  const form = $("editCommande-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    await onSubmit();
  });
}

export async function init() {
  console.log("✅ editCommande.js chargé");

  if (!window.isConnected || !window.isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  const id = getCommandeId();
  if (!id) {
    showAlert("ID de commande manquant: /editCommande?id=16", "danger");
    return;
  }

  // mettre l’id dans le lien delete (si tu as l’id sur deleteCommande)
  const del = $("deleteCommandeLink");
  if (del) del.href = `/deleteCommande?id=${encodeURIComponent(id)}`;

  try {
    const commande = await fetchCommande(id);

    // afficher menu
    renderMenu(commande.menu ?? null);

    // préremplir form
    prefillForm(commande);

    // submit
    bindForm(async () => {
      await updateCommande(id, commande);
      showAlert("✅ Commande modifiée avec succès. Redirection…", "success");
      setTimeout(() => (window.location.href = "/historiqueCommande"), 1500);
    });
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Impossible de charger la commande.", "danger");
  }
}
