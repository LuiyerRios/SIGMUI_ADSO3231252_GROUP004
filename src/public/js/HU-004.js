console.log("HU-004.js cargado");


let reservations = [];



// Calcular total

function calculate(){


    const type = document.getElementById("type").value;

    const quantity = Number(
        document.getElementById("quantity").value
    );


    if(quantity <= 0){

        alert("Ingrese una cantidad válida");

        return;

    }



    let total = 0;



    if(type === "hour"){

        total = quantity * 2000;

    }


    if(type === "day"){

        total = quantity * 20000;

    }



    document.getElementById("total").textContent =
        total.toLocaleString("es-US");

}




// Confirmar reserva

function confirmReservation(){



    const plate =
        document.getElementById("plate").value;


    const zone =
        document.getElementById("zone").value;


    const type =
        document.getElementById("type").value;


    const quantity =
        Number(document.getElementById("quantity").value);



    const total =
        document.getElementById("total").textContent;




    if(!plate || !zone || !quantity){

        alert("Complete todos los campos");

        return;

    }




    const reservation = {


        plate: plate.toUpperCase(),


        location: zone,


        time:
        type === "hour"
        ? quantity + " Hour(s)"
        : quantity + " Day(s)",


        total: total,


        status:"Confirmed"


    };





    fetch("/reservas",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },


        body:JSON.stringify(reservation)

    })



    .then(response=>response.json())


    .then(data=>{


        console.log(data);


        reservations.push(reservation);


        showReservations();


        alert("Reserva creada correctamente");


    })



    .catch(error=>{


        console.log(error);


        alert("Error guardando reserva");


    });



}




// Mostrar tabla

function showReservations(){


    const tableBody =
    document.getElementById("tableBody");



    tableBody.innerHTML="";



    reservations.forEach((reservation,index)=>{


        const row =
        document.createElement("tr");



        row.innerHTML=`

        <td>${index+1}</td>

        <td>${reservation.plate}</td>

        <td>${reservation.location}</td>

        <td>${reservation.time}</td>

        <td>${reservation.status}</td>

        `;



        tableBody.appendChild(row);



    });



}




// Volver atrás

function goBack(){

    window.history.back();

}