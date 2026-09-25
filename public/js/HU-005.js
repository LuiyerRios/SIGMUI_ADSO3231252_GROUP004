/*CONFIGURACIÓN*/
const PRICE_PER_HOUR = 2000;

/*VARIABLES*/
let hours = 0;
let expirationTime = new Date();
let selectedReservation = null;
let selectedRow = null;
let countdownInterval = null;

/*NAVEGACIÓN*/
function goBack() {
    window.location.href = "/HU-003";
}

/*RESERVAS*/
function selectRow(location, vehicle, plate, status, button) {

    if (status !== "Active") {
        alert("Solo las reservas activas pueden extenderse.");
        return;
    }

    selectedRow = button.closest("tr");

    selectedReservation = {
        location,
        vehicle,
        plate,
        status
    };

    document.getElementById("location").value = "Ubicación: " + location;
    document.getElementById("vehicle").value = "Vehículo: " + vehicle;
    document.getElementById("plate").value = "Placa: " + plate;

    document.querySelector(".submit").style.display = "block";

    hours = 0;

    updateHours();
    updatePrice();
}

/*TIEMPO*/
function changeTime(value) {

    hours += value;

    if (hours < 0) {
        hours = 0;
    }

    updateHours();
    updatePrice();
}

/*ACTUALIZAR HORAS*/
function updateHours() {

    if (hours === 0) {

        document.getElementById("hours").textContent = "0 horas";

    } else if (hours === 1) {

        document.getElementById("hours").textContent = "1 hora";

    } else {

        document.getElementById("hours").textContent = hours + " horas";
    }
}

/*PRECIO*/
function updatePrice() {

    const total = hours * PRICE_PER_HOUR;

    document.getElementById("price").textContent =
        "$" + total.toLocaleString();
}

/*CRONÓMETRO*/
function updateTimer(timer, seconds) {

    const horas = Math.floor(seconds / 3600);
    const minutos = Math.floor((seconds % 3600) / 60);
    const segundos = seconds % 60;

    timer.textContent =
        `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

/*PAGO*/
function confirmExtension() {

    if (selectedReservation === null) {
        alert("Seleccione una reserva primero.");
        return;
    }

    if (hours === 0) {
        alert("Seleccione mínimo una hora.");
        return;
    }

    const confirmation = confirm("¿Desea extender la reserva?");

    if (!confirmation) {
        return;
    }

    updateExpirationTime();

    const status = selectedRow.querySelector(".status");
    const plus = selectedRow.querySelector(".plus");
    const countdown = selectedRow.querySelector(".countdown");
    const timer = selectedRow.querySelector(".timer");

    status.textContent = "Active";
    status.classList.remove("pending");
    status.classList.add("active");

    plus.style.display = "inline-block";
    countdown.style.display = "flex";

    let remainingSeconds = hours * 3600;

    updateTimer(timer, remainingSeconds);

    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

        remainingSeconds--;

        updateTimer(timer, remainingSeconds);

        if (remainingSeconds <= 0) {

            clearInterval(countdownInterval);

            status.textContent = "Finish";

            status.classList.remove("active");
            status.classList.add("pending");

            plus.style.display = "none";
            countdown.style.display = "none";
        }

    }, 1000);

    alert("Pago realizado correctamente.");

    resetForm();
}

/*FINALIZACIÓN DE TIEMPO*/
function updateExpirationTime() {

    expirationTime.setHours(
        expirationTime.getHours() + hours
    );

    alert(
        "Nueva hora de finalización:\n\n" +
        expirationTime.toLocaleTimeString()
    );
}

/*RESTABLECER FORMULARIO*/
function resetForm() {

    selectedReservation = null;
    selectedRow = null;

    hours = 0;

    document.getElementById("location").value = "";
    document.getElementById("vehicle").value = "";
    document.getElementById("plate").value = "";

    updateHours();
    updatePrice();

    document.querySelector(".submit").style.display = "none";
}

/*INICIALIZACIÓN*/
window.onload = function () {

    updateHours();
    updatePrice();

    document.querySelectorAll("tbody tr").forEach(row => {

        const status = row.querySelector(".status");
        const plus = row.querySelector(".plus");
        const countdown = row.querySelector(".countdown");

        if (!status || !plus) return;

        if (status.textContent.trim() !== "Active") {

            plus.style.display = "none";

            if (countdown) {
                countdown.style.display = "none";
            }

        } else {

            plus.style.display = "inline-block";
        }

    });

};