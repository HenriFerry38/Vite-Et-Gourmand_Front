export function initCommandeHoraire() {
  const horairesMatin = [
    "08:00","08:30","09:00","09:30","10:00","10:30",
    "11:00","11:30","12:00","12:30","13:00","13:30"
  ];

  const horairesSoir = [
    "16:30","17:00","17:30","18:00","18:30","19:00",
    "19:30","20:00","20:30","21:00","22:00","22:30"
  ];

  const selectHour = document.getElementById("selectHour");
  const radios = document.querySelectorAll("input[name='serviceChoisi']");

  if (!selectHour || radios.length === 0) return;

  function updateHoraires(type) {
    selectHour.innerHTML = "";
    const horaires = type === "matin" ? horairesMatin : horairesSoir;

    for (const heure of horaires) {
      const option = document.createElement("option");
      option.value = heure;
      option.textContent = heure;
      selectHour.appendChild(option);
    }
  }

  radios.forEach(radio => {
    radio.addEventListener("change", e => updateHoraires(e.target.value));
  });

  const checked = document.querySelector("input[name='serviceChoisi']:checked");
  updateHoraires(checked?.value ?? "soir");
}
