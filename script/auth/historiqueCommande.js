console.log("historique chargé");

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

async function loadHistorique() {

  if (!isConnected()) {
    window.location.href = "/signin";
    return;
  }

  const container = document.getElementById("historique-container");
  const loader = document.getElementById("historique-loader");
  const empty = document.getElementById("historique-empty");

  try {

    const res = await fetch(`${apiUrl}commande/historique`, {
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": getToken()
      }
    });

    loader.classList.add("d-none"); // 👈 on le cache ici

    if (!res.ok) {
      container.innerHTML = "Erreur de chargement.";
      return;
    }

    const commandes = await res.json();

    if (!commandes.length) {
      empty.classList.remove("d-none");
      return;
    }

    const statutLabel = (s) => {
        const key = String(s ?? "").toLowerCase();
        const labels = {
            en_attente: "En attente",
            acceptee: "Acceptée",
            refusee: "Refusée",
            preparation: "Préparation",
            livraison: "Livraison",
            livree: "Livrée",
            retour_materiel: "Retour matériel",
            annulee: "Annulée",
            terminee: "Terminée",
        };
        return labels[key] ?? (s ?? "—");
        };

        const badgeClass = (s) => {
        const key = String(s ?? "").toLowerCase();
        if (key === "en_attente") return "bg-warning text-dark";
        if (key === "terminee") return "bg-success";
        if (key === "refusee" || key === "annulee") return "bg-danger";
        if (key === "livree") return "bg-info text-dark";
        if (key === "preparation" || key === "livraison") return "bg-primary";
        return "bg-secondary";
        };

        container.innerHTML = commandes.map(c => {
        const statutKey = String(c.statut ?? "").toLowerCase();

        const editBtn = (statutKey === "en_attente")
            ? `<a href="/editCommande?commandeId=${encodeURIComponent(c.id)}"
                class="btn btn-outline-primary btn-sm">
                Modifier la commande
            </a>`
            : "";

        const avisBtn = (statutKey === "terminee")
            ? `<a href="/editAvis?commandeId=${encodeURIComponent(c.id)}"
                class="btn btn-primary btn-sm">
                Laisser un avis
            </a>`
            : "";

        return `
            <div class="col-12">
            <div class="card shadow-sm">
                <div class="card-body">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <h5 class="card-title mb-1">Commande #${c.numero_commande}</h5>
                    <span class="badge ${badgeClass(statutKey)}">
                    ${statutLabel(statutKey)}
                    </span>
                </div>

                <p class="mb-1"><strong>Date :</strong> ${c.date_prestation ?? "—"}</p>
                <p class="mb-1"><strong>Heure :</strong> ${c.heure_prestation ?? "—"}</p>

                <!-- ✅ Traçabilité -->
                <p class="mb-1">
                    <strong>Maj statut :</strong>
                    ${c.statut_updated_at 
                    ? `${statutLabel(statutKey)} le ${formatDateTime(c.statut_updated_at)}`
                    : "Aucune mise à jour enregistrée"}
                </p>

                <p class="mb-1"><strong>Personnes :</strong> ${c.nb_personne ?? "—"}</p>
                <p class="mb-1"><strong>Menu :</strong> ${c.menu?.titre ?? "Menu"}</p>
                <p class="fw-bold text-primary mb-0">${c.prix_total ?? "—"} €</p>

                <div class="d-flex justify-content-end gap-2 mt-3">
                    ${editBtn}
                    ${avisBtn}
                </div>
                </div>
            </div>
            </div>
        `;
        }).join("");
    
    } catch (e) {
        loader.classList.add("d-none"); // 👈 aussi en cas d'erreur
        container.innerHTML = "Erreur serveur.";
        console.error(e);
    }
}

loadHistorique();
