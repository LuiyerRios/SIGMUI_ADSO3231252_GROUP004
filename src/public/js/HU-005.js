/*CONFIGURATION*/
const PRICE_PER_HOUR = 2000;

/*VARIABLES*/
let hours = 0;
let expirationTime = new Date();
let selectedReservation = null;
let selectedRow = null;

/*NAVIGATION*/
function goBack() {
    window.history.back();
}

/*RESERVATIONS*/
function selectRow(location, vehicle, plate, status, button) {

    if (status !== "Active") {
        alert("Only active reservations can be extended.");
        return;
    }

    selectedRow = button.closest("tr");

    selectedReservation = {
        location,
        vehicle,
        plate,
        status
    };

    document.getElementById("location").value = "Location: " + location;
    document.getElementById("vehicle").value = "Vehicle: " + vehicle;
    document.getElementById("plate").value = "Plate: " + plate;

    document.querySelector(".submit").style.display = "block";

    hours = 0;
    updateHours();
    updatePrice();
}

/*TIME*/
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
        document.getElementById("hours").textContent = "0 hours";
    } else if (hours === 1) {
        document.getElementById("hours").textContent = "1 hour";
    } else {
        document.getElementById("hours").textContent = hours + " hours";
    }
}

/*PRICE*/
function updatePrice() {

    const total = hours * PRICE_PER_HOUR;

    document.getElementById("price").textContent =
        "$" + total.toLocaleString();
}

/*PAYMENT*/
function confirmExtension() {

    if (selectedReservation === null) {
        alert("Select a reservation first.");
        return;
    }

    const confirmation = confirm(
        "Do you want to extend the reservation?"
    );

    if (!confirmation) {
        return;
    }

    updateExpirationTime();

    if (selectedRow) {

        const status = selectedRow.querySelector(".status");

        status.textContent = "To finish";
        status.classList.remove("active");
        status.classList.add("pending");

        selectedRow.querySelector(".plus").style.display = "none";
    }

    alert("Payment successful.");

    resetForm();
}

/*EXPIRATION*/
function updateExpirationTime() {

    expirationTime.setHours(
        expirationTime.getHours() + hours
    );

    alert(
        "New expiration time:\n\n" +
        expirationTime.toLocaleTimeString()
    );
}

/*RESET*/
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

/*INITIALIZATION*/
window.onload = function () {

    updateHours();
    updatePrice();
}