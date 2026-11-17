// HU-009 · Paso 2: requisitos de la contraseña en vivo y confirmación antes de enviar (el servidor valida igual)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reset-form");
  if (!form) return;
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirmPassword");
  const rules = document.getElementById("password-rules");
  const errorText = document.getElementById("reset-error");
  const checks = {
    length: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    number: (v) => /[0-9]/.test(v)
  };

  password.addEventListener("input", () => {
    rules.querySelectorAll("li[data-rule]").forEach((li) => {
      li.classList.toggle("ok", checks[li.dataset.rule](password.value));
    });
    errorText.textContent = "";
  });
  confirm.addEventListener("input", () => { errorText.textContent = ""; });

  form.addEventListener("submit", (event) => {
    const value = password.value;
    if (!Object.values(checks).every((check) => check(value))) {
      event.preventDefault();
      errorText.textContent = "The new password must have at least 8 characters, one uppercase letter and one number.";
      password.focus();
    } else if (value !== confirm.value) {
      event.preventDefault();
      errorText.textContent = "The passwords do not match.";
      confirm.focus();
    }
  });
});
