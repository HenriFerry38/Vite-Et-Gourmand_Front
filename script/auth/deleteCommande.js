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
  const el = $("deleteCommande-alert");
  if (!el) return;
  el.className = `alert alert-${type} mt-3`;
  el.textContent = message;
  el.style.display = "block";
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

function isoToDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR");
}

function isoToTime(iso) {
  if (!iso) return "";
  const s = String(iso);
  const tIndex = s.indexOf("T");
  return tIndex !== -1 ? s.slice(tIndex + 1, tIndex + 6) : "";
}

function renderCommandeSummary(commande) {
  const container = $("commande-summary");
  if (!container) return;

  container.innerHTML = `
    <div class="card shadow-sm rounded-4 p-3">
      <div><strong>Date :</strong> ${isoToDate(commande.datePrestation)}</div>
      <div><strong>Heure :</strong> ${isoToTime(commande.heurePrestation)}</div>
      <div><strong>Personnes :</strong> ${commande.nbPersonne}</div>
      <div><strong>Adresse :</strong> ${commande.adressePrestation}</div>
      <div><strong>Statut :</strong> ${commande.statut}</div>
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
    throw new Error(data?.message || `Erreur chargement commande (${res.status})`);
  }

  return data;
}

async function deleteCommande(id) {
  const res = await fetch(`${API}/commande/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Erreur suppression (${res.status})`);
  }
}

function bindDeleteButton(id) {
  const btn = $("confirmDeleteBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const confirmDelete = window.confirm(
      "⚠️ Cette action est définitive. Confirmez-vous la suppression ?"
    );

    if (!confirmDelete) return;

    try {
      await deleteCommande(id);

      showAlert("✅ Commande supprimée avec succès. Redirection…", "success");

      setTimeout(() => {
        window.location.href = "/historiqueCommande";
      }, 1500);
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Erreur lors de la suppression.", "danger");
    }
  });
}

export async function init() {
  console.log("✅ deleteCommande.js chargé");

  if (!window.isConnected || !window.isConnected()) {
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  const id = getCommandeId();
  if (!id) {
    showAlert("ID de commande manquant.", "danger");
    return;
  }

  try {
    const commande = await fetchCommande(id);
    renderCommandeSummary(commande);
    bindDeleteButton(id);
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Impossible de charger la commande.", "danger");
  }
}
