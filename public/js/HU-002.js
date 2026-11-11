/* Descripción: Manejo del evento submit, validaciones en cliente y envío del registro a POST /signup
 */

// Requisitos de la contraseña: actualiza las barras y los textos al escribir
const passwordRules = {
    length: (value) => value.length >= 8,
    upper: (value) => /[A-Z]/.test(value),
    number: (value) => /[0-9]/.test(value),
    symbol: (value) => /[^A-Za-z0-9]/.test(value)
};

function updatePasswordRules() {
    const value = document.getElementById("password").value;
    let passed = 0;

    document.querySelectorAll("[data-rule]").forEach((item) => {
        const isMet = passwordRules[item.dataset.rule](value);
        if (isMet) passed++;
        item.textContent = `${isMet ? "✓" : "○"} ${item.dataset.label}`;
        item.classList.toggle("text-success", isMet);
    });

    document.querySelectorAll("[data-strength-bar]").forEach((bar, index) => {
        bar.classList.toggle("bg-brand-tech", index < passed);
        bar.classList.toggle("bg-track", index >= passed);
    });
}

document.getElementById("password").addEventListener("input", updatePasswordRules);

document.getElementById("registro-form").addEventListener("submit", async function(e) {
    // 1. Prevenir que el formulario se envíe de forma tradicional (recarga de página)
    e.preventDefault(); 

    // 2. Captura de los valores desde el DOM
    const formData = {
        full_name: document.getElementById("full_name").value.trim(),
        email: document.getElementById("email_address").value.trim(),
        phone: document.getElementById("phone_number").value.trim(),
        password: document.getElementById("password").value,
        confirm: document.getElementById("confirm_password").value,
        terms: document.getElementById("terms").checked
    };

    const errorDiv = document.getElementById("mensaje-feedback");
    const submitButton = this.querySelector("button[type=submit]");
    const showMessage = (text, color) => {
        errorDiv.textContent = text;
        errorDiv.style.color = color;
    };

    // 3. VALIDACIONES (las mismas que revisa el servidor)
    if (!passwordRules.length(formData.password)) {
        return showMessage("Password must have at least 8 characters.", "red");
    }
    if (!passwordRules.upper(formData.password)) {
        return showMessage("Password must include an uppercase letter.", "red");
    }
    if (!passwordRules.number(formData.password)) {
        return showMessage("Password must include a number.", "red");
    }
    if (formData.password !== formData.confirm) {
        return showMessage("Passwords do not match.", "red");
    }

    // 4. ENVÍO AL SERVIDOR: guarda el usuario en la base de datos
    showMessage("Creating your account...", "blue");
    submitButton.disabled = true;

    try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (response.ok) {
            showMessage(result.message, "green");
            this.reset();
            updatePasswordRules();
        } else {
            showMessage(result.error, "red");
        }
    } catch (err) {
        // Manejo de errores de conexión o de red
        showMessage("Error connecting to the server. Please try again later.", "red");
        console.error("Detalle del error:", err);
    } finally {
        submitButton.disabled = false;
    }
});