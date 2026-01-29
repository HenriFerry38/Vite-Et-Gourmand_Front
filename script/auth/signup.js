
const inputNom = document.getElementById("NomInput");
const inputPrenom = document.getElementById("PrenomInput");
const inputTelephone = document.getElementById("TelephoneInput");
const inputAdresse = document.getElementById("AdresseInput");
const inputVille = document.getElementById("VilleInput");
const inputCodePostal = document.getElementById("CodePostalInput");
const inputPays = document.getElementById("PaysInput");
const inputEmail = document.getElementById("EmailInput");
const inputPassword = document.getElementById("PasswordInput");
const inputValidatePassword = document.getElementById("ValidatePasswordInput");
const btnValidation = document.getElementById("btn-validate-inscription");
const formInscription = document.getElementById("formulaireInscription");

inputNom.addEventListener("keyup", validateForm);
inputPrenom.addEventListener("keyup", validateForm);
inputTelephone.addEventListener("keyup", validateForm);
inputAdresse.addEventListener("keyup", validateForm);
inputVille.addEventListener("keyup", validateForm);
inputCodePostal.addEventListener("keyup", validateForm);
inputPays.addEventListener("keyup", validateForm);
inputEmail.addEventListener("keyup", validateForm);
inputPassword.addEventListener("keyup", validateForm);
inputValidatePassword.addEventListener("keyup", validateForm);

btnValidation.addEventListener("click", InscrireUtilisateur);

function validateForm(){
    const nomOk = validateRequired(inputNom);
    const prenomOk = validateRequired(inputPrenom);
    const telephoneOk = validateRequired(inputTelephone);
    const adresseOk = validateRequired(inputAdresse);
    const villeOk = validateRequired(inputVille);
    const codepostalOk =  validateRequired(inputCodePostal);
    const paysOk = validateRequired(inputPays);
    const emailOk =  validateEmail(inputEmail);
    const passwordOk =  validatePassword(inputPassword);
    const passwordConfirmOk = validateConfirmationPassword(inputPassword, inputValidatePassword);

    if( nomOk && prenomOk &&
        telephoneOk && adresseOk &&
        villeOk && codepostalOk && 
        paysOk && emailOk &&
        passwordOk && passwordConfirmOk
    ){
        btnValidation.disabled = false;
    }

    else{
        btnValidation.disabled = true;
    }
}

function validateEmail(input){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mailUser = input.value;

    if(mailUser.match(emailRegex)){
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
        return true;
    }
    else{
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
        return false;
    }
}

function validateConfirmationPassword(inputPwd, inputConfirmPwd){
    if(inputPwd.value == inputConfirmPwd.value){
        inputConfirmPwd.classList.add("is-valid");
        inputConfirmPwd.classList.remove("is-invalid");
        return true;
    }
    else{
        inputConfirmPwd.classList.add("is-invalid");
        inputConfirmPwd.classList.remove("is-valid");
        return false;
    }
}

function validatePassword(input){
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordUser = input.value;

    if(passwordUser.match(passwordRegex)){
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
        return true;
    }
    else{
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
        return false;
    }
}

function validateRequired(input){
    if (input.value != ''){
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
        return true;
    }
    else{
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
        return false;
    }
}

function InscrireUtilisateur(){
    const dataForm = new FormData(formInscription);

    
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "prenom": dataForm.get("Prenom"),
        "nom": dataForm.get("Nom"),
        "email": dataForm.get("Email"),
        "password": dataForm.get("Password"),
        "telephone": dataForm.get("Telephone"),
        "adresse": dataForm.get("Adresse"),
        "code_postal": dataForm.get("CodePostal"),
        "ville": dataForm.get("Ville"),
        "pays": dataForm.get("Pays")
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    fetch(apiUrl+"registration", requestOptions)
    .then(response => {
        if(response.ok){
        return response.json();
        }
        else{
            alert("Erreur los de l'inscription");
        }
    })
    .then(result => { 
        alert("Bravo"+dataForm.get("Prenom")+", vous êtes maintenant inscrit chez les Gourmands, vous pouvez vous connecter.")
        document.location.href="/signin"
    })
    .catch((error) => console.error(error));
}