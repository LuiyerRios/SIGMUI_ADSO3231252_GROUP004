// 1. Evento para garantizar integridad de datos: Placas siempre en mayusculas
document.getElementById("plate-input").addEventListener("input", function() {
    this.value = this.value.toUpperCase();
});

/**
 * Funcion auxiliar para formatear la hora (Requerimiento visual)
 */
function formatHour(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Funcion principal de validacion (checkPlate)
 * Esta funcion procesa la entrada del agente y actualiza el DOM.
 * Integracion n8n: Preparada para ser conectada a un webhook mediante fetch().
 */
function checkPlate() {
    const plateInput = document.getElementById("plate-input");
    const plate = plateInput.value.trim().toUpperCase();
    const resultContainer = document.getElementById("result");

    // Limpieza de interfaz antes de mostrar nuevos datos
    resultContainer.innerHTML = ""; 

    // Validacion de campo vacio
    if (!plate) {
        resultContainer.innerHTML = "<p style='color:red; text-align:center;'>Error: Debe ingresar una matricula</p>";
        return;
    }

    // Expresion regular para validar formato estandar (3 letras, 3 numeros)
    const formato = /^[A-Z]{3}[0-9]{3}$/;
    if (!formato.test(plate)) {
        resultContainer.innerHTML = "<p style='color:red; text-align:center;'>Formato incorrecto. Ejemplo: ABC123</p>";
        return;
    }

    // --- Simulacion de consulta al sistema (Aqui iria el Fetch a n8n) ---
    procesarRespuesta(plate);
}

/**
 * Logica para renderizar los estados segun el resultado de la consulta
 */
function procesarRespuesta(plate) {
    let inicio = new Date();
    let fin = new Date();
    fin.setHours(inicio.getHours() + 2);

    // Logica condicional basica para el prototipo
    if (plate === "ABC123") {
        renderizarUI("success", "PAYMENT PROCESSED", "Zone A1", `${formatHour(inicio)} - ${formatHour(fin)} (2h)`, "Valid", "fa-check");
    } else if (plate === "XYZ123") {
        renderizarUI("error", "PAYMENT INACTIVE", "Zone B2", "Expirado hace 1 hora", "Expired", "fa-xmark");
    } else {
        renderizarNoRegistrado();
    }
}

// --- FUNCIONES DE RENDERING (Modularidad para evitar redundancia de codigo) ---

function renderizarUI(tipo, titulo, zona, detalle, badge, iconClass) {
    const html = `
        <article class="card card--${tipo}">
            <div class="card__icon icon-status--${tipo}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="card__info">
                <h3>${titulo}</h3>
                <p>${zona}</p>
                <p>${detalle}</p>
            </div>
            <span class="badge badge--${tipo}">${badge}</span>
        </article>`;
    document.getElementById("result").innerHTML = html;
}

function renderizarNoRegistrado() {
    document.getElementById("result").innerHTML = `
        <h3 class="results-area__subtitle" style="margin-top:20px;">NOT REGISTERED</h3>
        <article class="card card--neutral">
            <div class="card__icon icon-status--neutral">
                <i class="fa-solid fa-circle-xmark"></i>
            </div>
            <div class="card__info">
                <p>La placa no presenta registros activos.</p>
            </div>
        </article>`;
}

// Botón CHECK
document.querySelector(".btn-check").addEventListener("click", checkPlate);

// Botón volver
document.querySelector(".header__back").addEventListener("click", () => {
     history.back();
    });