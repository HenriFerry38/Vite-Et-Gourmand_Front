
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



function validateForm(){
    const nomOk = validateRequired(inputNom);
    const prenomOk = validateRequired(inputPrenom);
    const telephoneOk = validateRequired(inputTelephone);
    const adresseOk = validateRequired(inputAdresse);
    const villeOk = validateRequired(inputVille);
    const codepostalOk =  validateRequired(inputCodePostal);
    const paysOk = validateRequired(inputPays);
    const emailOk =  validateEmail(inputEmail);

    if(nomOk && prenomOk && telephoneOk && adresseOk && villeOk && codepostalOk && paysOk && emailOk){
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
