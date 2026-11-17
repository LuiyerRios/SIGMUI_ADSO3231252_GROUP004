// HU-009 · Olvidé mi contraseña: valida el correo y pide el enlace con POST /forgot-password
const form = document.getElementById("recovery-form");
const email = document.getElementById("email");
const emailField = document.querySelector(".email-field");
const emailError = document.getElementById("email-error");
const formMessage = document.getElementById("form-message");
const sendButton = document.getElementById("send-button");
const buttonLabel = sendButton.querySelector("span");

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

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

email.addEventListener("input", () => {
  clearEmailError();
  formMessage.textContent = "";
  formMessage.className = "form-message";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const address = email.value.trim();

  if (address === "") {
    showEmailError("Enter your email address to continue.");
    email.focus();
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(address)) {
    showEmailError("Enter a valid email address, for example: name@example.com.");
    email.focus();
    return;
  }

  clearEmailError();
  sendButton.disabled = true;
  buttonLabel.textContent = "Sending…";

  try {
    const response = await fetch("/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address })
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 404 || response.status === 400) {
      showEmailError(data.error);
    } else if (!response.ok) {
      // El correo no salió: se puede intentar de nuevo
      showMessage(data.error || "We could not send the recovery email. Please try again.", "error");
    } else {
      showMessage(data.message, "success");
      buttonLabel.textContent = "Send again";
    }
  } catch (err) {
    showMessage("We could not reach the server. Check your connection and try again.", "error");
  } finally {
    sendButton.disabled = false;
    if (buttonLabel.textContent === "Sending…") buttonLabel.textContent = "Send reset link";
  }
});
