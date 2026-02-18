export async function init() {
    initAvisNew();
}

function initAvisNew() {
  const form = document.getElementById("avis-form");
  if (!form) return;

  // Guard auth
  if (!isConnected()) {
    alert("Connecte-toi pour laisser un avis.");
    const current = window.location.pathname + window.location.search;
    window.location.href = `/signin?redirect=${encodeURIComponent(current)}`;
    return;
  }

  const btn = document.getElementById("btn-avis");
  const btnBack = document.getElementById("btn-back");
  const errorEl = document.getElementById("avisError");

  const noteInput = document.getElementById("avisNote");
  const noteInvalid = document.getElementById("noteInvalid");

  const descEl = document.getElementById("avisDescription");
  const charCount = document.getElementById("charCount");

  const commandeCard = document.getElementById("commandeCard");
  const commandeRef = document.getElementById("commandeRef");
  const commandeMeta = document.getElementById("commandeMeta");
  const commandeStatut = document.getElementById("commandeStatut");
  const commandeInfos = document.getElementById("commandeInfos");

  const params = new URLSearchParams(window.location.search);
  const commandeId = Number(params.get("commandeId"));

  // Helpers
  const showError = (msg) => {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove("d-none");
  };
  const hideError = () => errorEl?.classList.add("d-none");

  const escapeHtml = (str = "") =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Rating stars
  const ratingNames = {
    1: "Mauvais",
    2: "Moyen",
    3: "Correct",
    4: "Très bon",
    5: "Excellent",
  };

  function renderStars(current = 0) {
    const host = document.getElementById("starRating");
    const label = document.getElementById("ratingLabel");
    const hint = document.getElementById("ratingHint");
    if (!host) return;

    host.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-sm p-0 border-0 bg-transparent";
      b.style.lineHeight = "1";
      b.setAttribute("aria-label", `Mettre ${i} étoile(s)`);

      // ★ filled / ☆ outline (simple, sans lib externe)
      b.innerHTML = `<span style="font-size: 1.6rem;">${i <= current ? "★" : "☆"}</span>`;

      b.addEventListener("click", () => {
        noteInput.value = String(i);
        noteInvalid.style.display = "none";
        renderStars(i);
      });

      host.appendChild(b);
    }

    const n = Number(noteInput.value || current || 0);
    if (!n) {
      label.textContent = "Choisis une note";
      hint.textContent = "Clique sur les étoiles ⭐";
    } else {
      label.textContent = `${n}/5  ${ratingNames[n] ?? ""}`;
      hint.textContent = "Tu peux ajuster si besoin";
    }
  }

  renderStars(0);

  // Char counter
  const syncCount = () => {
    if (!descEl || !charCount) return;
    charCount.textContent = String(descEl.value.length);
  };
  descEl?.addEventListener("input", syncCount);
  syncCount();

  // Back button
  btnBack?.addEventListener("click", () => {
    // retourne à la page précédente si possible, sinon compte
    if (window.history.length > 1) window.history.back();
    else route("/account");
  });

  // Validate commandeId
  if (!commandeId || Number.isNaN(commandeId)) {
    showError("Commande introuvable. Reviens à ton historique et clique sur “Laisser un avis”.");
    btn && (btn.disabled = true);
    return;
  }

  // (Optionnel) fetch commande détails pour récap premium
  // Si ton endpoint /api/commande/{id} existe et requiert auth, ça marche.
  async function loadCommandeSummary() {
    try {
        const res = await fetch(`${apiUrl}commande/${commandeId}`, {
        headers: {
            Accept: "application/json",
            "X-AUTH-TOKEN": getToken(),
        },
        });

        const txt = await res.text().catch(() => "");
        let data = null;
        try {
            data = txt ? JSON.parse(txt) : null;
        } catch {
            data = null;
        }

        console.log("[avis-new] commande fetch:", res.status, data || txt);

        // ✅ si ça échoue, on affiche quand même la card avec un message
        if (!res.ok) {
        commandeRef.textContent = `#${commandeId}`;
        commandeMeta.textContent = "Récap commande indisponible";
        commandeStatut.textContent = String(res.status);
        commandeInfos.innerHTML = `<div class="text-muted">Impossible de charger la commande (${res.status}).</div>`;
        commandeCard.classList.remove("d-none");
        return;
        }

        commandeRef.textContent = `#${data?.numeroCommande ?? commandeId}`;
        commandeStatut.textContent = data?.statut ?? "—";

        // date + heure (heurePrestation est une date ISO)
        const date = data?.datePrestation
        ? new Date(data.datePrestation).toLocaleDateString()
        : null;

        const heure = data?.heurePrestation
        ? new Date(data.heurePrestation).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : null;

        const metaParts = [];
        if (date) metaParts.push(`Prestation: ${date}`);
        if (heure) metaParts.push(`à ${heure}`);
        commandeMeta.textContent = metaParts.length ? metaParts.join(" ") : "Détails de la commande";

        const infoParts = [];
        if (data?.menu?.titre) {infoParts.push(`<div><span class="text-muted">Menu:</span> ${escapeHtml(data.menu.titre)}</div>`);}
        if (data?.adressePrestation) infoParts.push(`<div><span class="text-muted">Adresse:</span> ${escapeHtml(data.adressePrestation)}</div>`);
        if (data?.nbPersonne) infoParts.push(`<div><span class="text-muted">Personnes:</span> ${escapeHtml(String(data.nbPersonne))}</div>`);
        if (data?.prixTotalFloat != null) infoParts.push(`<div><span class="text-muted">Total:</span> ${escapeHtml(String(data.prixTotalFloat))}€</div>`);

        commandeInfos.innerHTML = infoParts.join("") || `<div class="text-muted">Récap indisponible.</div>`;
        commandeCard.classList.remove("d-none");

    } catch (err) {
      console.error("Erreur loadCommandeSummary:", err);
    }
  }

  loadCommandeSummary();

  // Submit
  form.onsubmit = async (e) => {
    e.preventDefault();
    hideError();

    form.classList.add("was-validated");

    // note custom validation
    const note = Number(noteInput.value);
    if (!note || note < 1 || note > 5) {
      noteInvalid.style.display = "block";
      return;
    } else {
      noteInvalid.style.display = "none";
    }

    if (!form.checkValidity()) return;

    const payload = {
      commande_id: commandeId,
      note,
      description: descEl.value.trim(),
    };

    btn.disabled = true;
    btn.textContent = "ENVOI…";

    try {
      const res = await fetch(`${apiUrl}avis`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": getToken(),
        },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      
      let data = null;
      try {
        data = txt ? JSON.parse(txt) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        console.error("Avis error:", res.status, data || txt);
        showError(data?.message || "Impossible d’envoyer l’avis.");
        return;
      }

      alert("Avis envoyé ✅ (en attente de validation)");
      window.history.pushState({}, "", "/account");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      console.error(err);
      showError("Impossible d’envoyer l’avis (réseau/API).");
    } finally {
      btn.disabled = false;
      btn.textContent = "Envoyer mon avis";
    }
  };
}
