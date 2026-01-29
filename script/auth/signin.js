const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnConnexion = document.getElementById("btnConnexion");
const formConnexion = document.getElementById("formulaireConnexion");

btnConnexion.addEventListener("click", checkCredentials);

function checkCredentials(){
    const dataForm = new FormData(formConnexion);

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "username": dataForm.get("Email"),
        "password": dataForm.get("Password"),
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    fetch(apiUrl+"login", requestOptions)
    .then(response => {
        if(response.ok){
            return response.json();
        }
        else{
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
        }
    })
    .then(result => { 
        //appel de l'api pour verfifer les credentials
         //Ici on recuperere le token
        const token = result.apiToken;
        setToken(token);
        //On place le token en cookies
        setCookie(roleCookieName, result.roles[0], 7);
        window.location.replace("/");

    })
    .catch((error) => console.error(error));
}