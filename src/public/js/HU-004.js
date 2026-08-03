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

// CONFIRMAR

function confirmReservation(){
    const plate =
    document.getElementById("plate")
    .value
    .trim();
    const location =
    document.getElementById("zone")
    .value;
    const type =
    document.getElementById("type")
    .value;
    const quantity =
    Number(
        document.getElementById("quantity")
        .value
    );

    const total =
    document.getElementById("total")
    .textContent;
    if(!plate || !location || quantity<=0){
        alert("Please fill in all required fields");
        return;
    }

    const reservation = {
        plate:
        plate.toUpperCase(),
        location:location,
        time:
        type==="hour"
        ?
        quantity+" Hour(s)"
        :
        quantity+" Day(s)",
        total:total,
        status:"Confirmed"
    };

    reservations.push(reservation);
    alert(
        "✅ Your reservation has been confirmed successfully"
    );
    cleanForm();
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
    window.location.href = "/HU-003";
}