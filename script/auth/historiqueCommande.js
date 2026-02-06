console.log("historique chargé");

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

    const badgeClass = (s) => {
    if (s === "EN_ATTENTE") return "bg-warning text-dark";
    if (s === "TERMINEE") return "bg-success";
    return "bg-secondary";
    };

    container.innerHTML = commandes.map(c => {
        const editBtn = (c.statut === "en_attente")
            ? `<a href="/editCommande?commandeId=${encodeURIComponent(c.id)}"
                    class="btn btn-outline-primary btn-sm">
                    Modifier la commande
                </a>`
            : "";

            const avisBtn = (c.statut === "terminee")
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
                    <span class="badge ${c.statut === "TERMINEE" ? "bg-success" : "bg-warning text-dark"}">
                    ${c.statut}
                    </span>
                </div>

                <p class="mb-1"><strong>Date :</strong> ${c.date_prestation}</p>
                <p class="mb-1"><strong>Heure :</strong> ${c.heure_prestation}</p>
                <p class="mb-1"><strong>Personnes :</strong> ${c.nb_personne}</p>
                <p class="mb-1"><strong>Menu :</strong> ${c.menu?.titre ?? "Menu"}</p>
                <p class="fw-bold text-primary mb-0">${c.prix_total} €</p>

                <div class="d-flex justify-content-end mt-3">
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
