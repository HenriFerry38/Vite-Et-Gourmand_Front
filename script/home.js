export async function init() {
  await loadHomeAvis();
}

async function loadHomeAvis() {
  const host = document.getElementById("home-avis");
  if (!host) return;

  try {
    const res = await fetch(`${apiUrl}avis`, { // ✅ par défaut: accepte
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      host.innerHTML = `<div class="col-12"><p class="text-muted text-center mb-0">Avis indisponibles.</p></div>`;
      return;
    }

    let avis = await res.json();
    if (!Array.isArray(avis)) avis = [];

    // option: n’afficher que les 2 derniers
    avis = avis.slice(0, 2);

    if (avis.length === 0) {
      host.innerHTML = `<div class="col-12"><p class="text-muted text-center mb-0">Aucun avis pour le moment.</p></div>`;
      return;
    }

    host.innerHTML = avis.map(renderAvisPill).join("");
  } catch (e) {
    console.error(e);
    host.innerHTML = `<div class="col-12"><p class="text-muted text-center mb-0">Avis indisponibles.</p></div>`;
  }
}

function renderAvisPill(a) {
  const escapeHtml = (s = "") =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const email = a.user?.email ?? "Client";
  const pseudo = escapeHtml(String(email).split("@")[0] || "Client");
  const desc = escapeHtml(a.description ?? "");
  const note = Math.min(5, Math.max(1, Number(a.note ?? 5)));

  const stars = "★".repeat(note) + "☆".repeat(5 - note);

  return `
    <div class="col-12 col-lg-6">
      <article class="review-pill d-flex align-items-start gap-3 p-3 h-100">
        <div class="review-avatar rounded-circle" aria-hidden="true"></div>
        <div class="flex-grow-1">
          <div class="fw-bold d-flex align-items-center justify-content-between gap-2">
            <span>${pseudo}</span>
            <span class="small text-muted">${stars}</span>
          </div>
          <p class="mb-0 small">${desc || "—"}</p>
        </div>
      </article>
    </div>
  `;
}
