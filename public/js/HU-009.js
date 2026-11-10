
const form = document.getElementById("recovery-form");
const email = document.getElementById("email");
const emailField = document.querySelector(".email-field");
const emailError = document.getElementById("email-error");
const formMessage = document.getElementById("form-message");
const sendButton = document.getElementById("send-button");

function showEmailError(message) {
  emailError.textContent = message;
  emailField.classList.add("has-error");
  email.setAttribute("aria-invalid", "true");
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function clearEmailError() {
  emailError.textContent = "";
  emailField.classList.remove("has-error");
  email.removeAttribute("aria-invalid");
}

email.addEventListener("input", () => {
  clearEmailError();
  formMessage.textContent = "";
  formMessage.className = "form-message";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const address = email.value.trim();

  if (address === "") {
    showEmailError("Ingresa tu correo electrónico para continuar.");
    email.focus();
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(address)) {
    showEmailError(
      "Ingresa un correo válido, por ejemplo: usuario@hotmail.com."
    );
    email.focus();
    return;
  }

  clearEmailError();

  formMessage.textContent =
    "La solicitud pasó la validación. La recuperación debe conectarse al servidor para enviar el enlace.";
  formMessage.className = "form-message success";
});
