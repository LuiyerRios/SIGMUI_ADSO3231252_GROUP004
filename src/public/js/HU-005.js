/*CONFIGURACIÓN*/
const PRICE_PER_HOUR = 2000;

/*VARIABLES*/
let hours = 0;
let expirationTime = new Date();
let selectedReservation = null;
let selectedRow = null;

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


function updateHours() {

    if (hours === 0) {

        document.getElementById("hours").textContent = "0 horas";

    } else if (hours === 1) {

        document.getElementById("hours").textContent = "1 hora";

    } else {

        document.getElementById("hours").textContent =
            hours + " horas";
    }
}


/*PRECIO*/
function updatePrice() {

    const total = hours * PRICE_PER_HOUR;

    document.getElementById("price").textContent =
        "$" + total.toLocaleString();
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


    const confirmation = confirm(
        "¿Desea extender la reserva?"
    );


    if (!confirmation) {
        return;
    }


    updateExpirationTime();


    if (selectedRow) {

        const status = selectedRow.querySelector(".status");
        const plus = selectedRow.querySelector(".plus");


        // La reserva sigue activa mientras tenga tiempo disponible
        status.textContent = "Active";

        status.classList.remove("pending");

        status.classList.add("active");


        plus.style.display = "inline-block";


        // Guarda la fila antes de reiniciar los datos
        const currentRow = selectedRow;


        // Conversión de horas a milisegundos
        const milliseconds = hours * 60 * 60 * 1000;



        setTimeout(() => {


            const status = currentRow.querySelector(".status");
            const plus = currentRow.querySelector(".plus");


            status.textContent = "Finish";

            status.classList.remove("active");

            status.classList.add("pending");


            // Oculta el botón cuando termina el tiempo
            plus.style.display = "none";


        }, milliseconds);

    }


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


    // Oculta el botón + cuando la reserva no está activa
    document.querySelectorAll("tbody tr").forEach(row => {


        const status = row.querySelector(".status");

        const plus = row.querySelector(".plus");


        if (!status || !plus) return;



        if (status.textContent.trim() !== "Active") {

            plus.style.display = "none";

        } else {

            plus.style.display = "inline-block";

        }

    });

}