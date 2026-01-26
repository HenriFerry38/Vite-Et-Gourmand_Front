const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnConnexion = document.getElementById("btnConnexion");

btnConnexion.addEventListener("click", checkCredentials);

function checkCredentials(){
    // Appel de l'api pour verifier les credentials.

    if(mailInput.value == "test@mail.com" && passwordInput.value == "123"){
        //Ici on recuperera le veritable token
        const token = "JeSuisUnTokenDeFouFurieuxHolalala";
        setToken(token);
        //placer le token en cookies
        setCookie(roleCookieName, "admin", 7);
        window.location.replace("/");
    }
    else{
        mailInput.classList.add("is-invalid");
        passwordInput.classList.add("is-invalid");
    }
}