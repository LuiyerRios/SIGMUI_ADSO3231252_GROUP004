
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
    showEmailError("Enter your email address to continue.");
    email.focus();
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(address)) {
    showEmailError(
      "Enter a valid email address, for example: usuario@hotmail.com."
    );
    email.focus();
    return;
  }

  clearEmailError();

  formMessage.textContent =
    "The request passed validation. The recovery process must connect to the server to send the link.";
  formMessage.className = "form-message success";
});
