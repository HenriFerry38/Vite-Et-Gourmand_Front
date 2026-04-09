const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnConnexion = document.getElementById("btnConnexion");
const formConnexion = document.getElementById("formulaireConnexion");

async function checkCredentials(e) {
  e?.preventDefault();

  const dataForm = new FormData(formConnexion);

  const payload = {
    username: dataForm.get("Email"),
    password: dataForm.get("Password"),
  };

  try {
    const res = await fetch(apiUrl + "login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Login failed:", res.status, txt);

      mailInput.classList.add("is-invalid");
      passwordInput.classList.add("is-invalid");
      return;
    }

    const result = await res.json();

    const token = result.apiToken;
    if (!token) {
      console.error("No apiToken in response:", result);
      return;
    }

    setToken(token);
    setRole(result.roles?.[0]);

    await Promise.resolve(showAndHideElementsForRoles());
    await Promise.resolve(refreshNavByRoles());

    window.location.replace("/vite-et-gourmand/");
  } catch (err) {
    console.error("Login error:", err);
  }
}

btnConnexion.addEventListener("click", checkCredentials);
formConnexion?.addEventListener("submit", checkCredentials);
