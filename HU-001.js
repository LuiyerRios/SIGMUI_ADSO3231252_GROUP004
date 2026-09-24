/* Descripción: Manejo del evento submit, validaciones en cliente e integración con n8n
 */

document.getElementById("registro-form").addEventListener("submit", async function(e) {
    // 1. Prevenir que el formulario se envíe de forma tradicional (recarga de página)
    e.preventDefault(); 

    // 2. Captura de los valores desde el DOM
    const formData = {
        full_name: document.getElementById("full_name").value.trim(),
        identity_document: document.getElementById("identity_document").value.trim(),
        email: document.getElementById("email_address").value.trim(),
        phone: document.getElementById("phone_number").value.trim(),
        plate: document.getElementById("vehicle_plate").value.trim().toUpperCase(),
        password: document.getElementById("password").value,
        confirm: document.getElementById("confirm_password").value
    };

    const errorDiv = document.getElementById("mensaje-feedback");
    
    // Configura aquí la URL de tu Webhook generado en n8n
    const webhookURL = "TU_WEBHOOK_URL_AQUI"; 

    // Limpiar mensajes anteriores y mostrar estado de procesamiento
    errorDiv.textContent = "Procesando registro...";
    errorDiv.style.color = "blue";

    // 3. VALIDACIONES
    // Regex para placa: 3 letras seguidas de 3 números (ej. ABC123)
    const formatoPlaca = /^[A-Z]{3}[0-9]{3}$/;

    if (!formatoPlaca.test(formData.plate)) {
        errorDiv.textContent = "Error: Formato de matrícula inválido. Ej: ABC123";
        errorDiv.style.color = "red";
        return; // Detiene la ejecución
    }

    // Validación de seguridad básica para la contraseña
    if (formData.password.length < 8) {
        errorDiv.textContent = "Error: La contraseña debe tener al menos 8 caracteres.";
        errorDiv.style.color = "red";
        return;
    }

    // Validación de coincidencia de contraseñas
    if (formData.password !== formData.confirm) {
        errorDiv.textContent = "Error: Las contraseñas no coinciden.";
        errorDiv.style.color = "red";
        return;
    }

    // 4. VALIDACIÓN DE DUPLICADOS (LocalStorage)
    // Recupera la lista existente o crea una nueva si no existe
    let correos = JSON.parse(localStorage.getItem("correos")) || [];
    if (correos.includes(formData.email)) {
        errorDiv.textContent = "Error: Este correo ya está registrado en el sistema.";
        errorDiv.style.color = "red";
        return;
    }

    // 5. INTEGRACIÓN CON N8N
    try {
        // Enviar datos mediante solicitud POST al Webhook
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData) // Convierte el objeto JS a JSON
        });

        // Verificar si la respuesta de n8n fue exitosa
        if (response.ok) {
            // Guardar el nuevo correo en el registro local
            correos.push(formData.email);
            localStorage.setItem("correos", JSON.stringify(correos));

            errorDiv.style.color = "green";
            errorDiv.textContent = "¡Registro exitoso! Información procesada por n8n.";
            
            // Limpiar formulario tras éxito
            document.getElementById("registro-form").reset();
        } else {
            throw new Error("No se pudo conectar con el servidor.");
        }
    } catch (err) {
        // Manejo de errores de conexión o de red
        errorDiv.style.color = "red";
        errorDiv.textContent = "Error de conexión. Verifica tu Webhook de n8n.";
        console.error("Detalle del error:", err);
    }
});