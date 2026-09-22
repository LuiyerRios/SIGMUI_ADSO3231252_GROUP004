/*DATABASE*/

const database = {

    reservations:[

        {
            id:"001567",
            location:"A2",
            vehicle:"001567",
            plate:"AJS456",
            status:"Active",
            hours:2,
            pricePerHour:2000,
            expiration:"18:00"
        },
        {
            id:"002215",
            location:"B1",
            vehicle:"002215",
            plate:"BJF356",
            status:"To finish",
            hours:1,
            pricePerHour:2000,
            expiration:"16:30"
        }
    ]
};

/*GET ALL RESERVATIONS*/

function getReservations(){
    return database.reservations;
}

/*GET RESERVATION BY PLATE*/

function getReservationByPlate(plate){
    return database.reservations.find(
        reservation => reservation.plate === plate
    );
}

/*GET RESERVATION BY ID*/

function getReservationById(id){
    return database.reservations.find(
        reservation => reservation.id === id
    );
}

/*UPDATE HOURS*/

function updateReservationHours(plate, extraHours){
    const reservation = getReservationByPlate(plate);
    if(!reservation){
        return false;
    }
    reservation.hours += extraHours;
    return true;
}

/*CHANGE STATUS*/

function updateReservationStatus(id,status){
    const reservation = getReservationById(id);
    if(!reservation){
        return false;
    }
    reservation.status = status;
    return true;
}

/*DELETE RESERVATION*/

function deleteReservation(id){
    const index = database.reservations.findIndex(
        reservation => reservation.id === id
    );
    if(index === -1){
        return false;
    }
    database.reservations.splice(index,1);
    return true;
}

/*ADD NEW RESERVATION*/

function addReservation(reservation){
    database.reservations.push(reservation);
}

/*TOTAL RESERVATIONS*/

function getTotalReservations(){
    return database.reservations.length;
}

/*ACTIVE RESERVATIONS*/

function getActiveReservations(){
    return database.reservations.filter(
        reservation => reservation.status === "Active"
    );
}

/*FINISHED RESERVATIONS*/

function getFinishedReservations(){
    return database.reservations.filter(
        reservation => reservation.status !== "Active"
    );
}