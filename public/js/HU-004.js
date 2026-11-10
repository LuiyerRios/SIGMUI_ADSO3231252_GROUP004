console.log("HU-004.js cargado");
let reservations = [];

// CALCULAR

function calculate(){
    const type =
    document.getElementById("type").value;
    const quantity =
    Number(
        document.getElementById("quantity").value
    );

    if(quantity <= 0){
        alert("Please enter a valid quantity");
        return;
    }

    let total;
    if(type === "hour"){
        total = quantity * 2000;
    }else{
        total = quantity * 20000;
    }

    document.getElementById("total")
    .textContent =
    total.toLocaleString("es-US");
}

// CONFIRMAR (CONECTADO A BD VÍA FETCH)

async function confirmReservation(){
    const plate = document.getElementById("plate").value.trim();
    const zoneValue = document.getElementById("zone").value; // ej: "A1"
    const type = document.getElementById("type").value;
    const quantity = Number(document.getElementById("quantity").value);
    const paymentMessage = document.getElementById("paymentMessage");

    if(!plate || !zoneValue || quantity <= 0){
        if (paymentMessage) {
            paymentMessage.style.display = 'block';
            paymentMessage.className = 'payment-msg error';
            paymentMessage.textContent = 'Please fill in all required fields';
        }
        return;
    }

    if (paymentMessage) {
        paymentMessage.style.display = 'block';
        paymentMessage.className = 'payment-msg info';
        paymentMessage.textContent = 'Processing payment...';
    }

    try {
        const response = await fetch('/api/payments/parking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plate: plate,
                zone: zoneValue ? zoneValue.charAt(0) : '',
                spaceId: zoneValue,
                rateType: type,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (paymentMessage) {
                paymentMessage.className = 'payment-msg error';
                paymentMessage.textContent = data.error || 'The payment could not be processed. Please try again.';
            }
            return;
        }

        // Agregar a la tabla de reservas en memoria utilizando los datos reales del servidor
        const reservation = {
            plate: plate.toUpperCase(),
            location: zoneValue,
            time: type === "hour" ? quantity + " Hour(s)" : quantity + " Day(s)",
            total: data.amount,
            receipt: data.receiptNumber,
            status: "Confirmed"
        };
        reservations.push(reservation);

        if (paymentMessage) {
            paymentMessage.className = 'payment-msg success';
            paymentMessage.textContent = `Payment completed. Receipt ${data.receiptNumber}`;
        }

        cleanForm();

    } catch (err) {
        console.error('Error confirming reservation:', err);
        if (paymentMessage) {
            paymentMessage.className = 'payment-msg error';
            paymentMessage.textContent = 'The payment could not be processed. Please try again.';
        }
    }
}

// MOSTRAR RESERVAS

function showReservations(){
    const table =
    document.getElementById(
        "reservationTable"
    );

    table.style.display="block";
    const body =
    document.getElementById(
        "tableBody"
    );

    body.innerHTML="";
    if(reservations.length===0){
        body.innerHTML=`
        <tr>
        <td colspan="5">
        No reservations found
        </td>
        </tr>
        `;
        return;
    }

    reservations.forEach(
        (reservation,index)=>{
        body.innerHTML += `
        <tr>
        <td>${index+1}</td>
        <td>${reservation.plate}</td>
        <td>${reservation.location}</td>
        <td>${reservation.time}</td>
        <td>
        <span class="status status-active">
        ${reservation.status}
        </span>
        </td>
        </tr>
        `;
    });
}

// LIMPIAR

function cleanForm(){

document.getElementById("plate").value="";
document.getElementById("zone").value="";
document.getElementById("quantity").value="";
document.getElementById("total").textContent="0";

}

// VOLVER

function goBack() {
    window.location.href = '/zones';
}