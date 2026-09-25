/* DATABASE */
const database = {
    reservations: [
        {
            id: "001567",
            location: "A2",
            vehicle: "001567",
            plate: "AJS456",
            status: "Active",
            hours: 2,
            pricePerHour: 2000,
            expiration: "18:00"
        },
        {
            id: "002215",
            location: "B1",
            vehicle: "002215",
            plate: "BJF356",
            status: "To finish",
            hours: 1,
            pricePerHour: 2000,
            expiration: "16:30"
        }
    ],
    // Método mock para consultas SQL tradicionales
    query: (sql, params, callback) => {
        const cb = typeof params === 'function' ? params : callback;
        if (cb) cb(null, database.reservations);
        return Promise.resolve([database.reservations]);
    },
    // Método mock para soportar modelos creados con Sequelize (db.define)
    define: (modelName, attributes) => {
        return {
            create: async (data) => ({ id: Date.now(), ...data, save: async () => {} }),
            findOne: async () => null,
            findAll: async () => [],
            findByPk: async () => null
        };
    }
};

/* GET ALL RESERVATIONS */
export function getReservations() {
    return database.reservations;
}

/* GET RESERVATION BY PLATE */
export function getReservationByPlate(plate) {
    return database.reservations.find(
        reservation => reservation.plate === plate
    );
}

/* GET RESERVATION BY ID */
export function getReservationById(id) {
    return database.reservations.find(
        reservation => reservation.id === id
    );
}

/* UPDATE HOURS */
export function updateReservationHours(plate, extraHours) {
    const reservation = getReservationByPlate(plate);
    if (!reservation) {
        return false;
    }
    reservation.hours += extraHours;
    return true;
}

/* CHANGE STATUS */
export function updateReservationStatus(id, status) {
    const reservation = getReservationById(id);
    if (!reservation) {
        return false;
    }
    reservation.status = status;
    return true;
}

/* DELETE RESERVATION */
export function deleteReservation(id) {
    const index = database.reservations.findIndex(
        reservation => reservation.id === id
    );
    if (index === -1) {
        return false;
    }
    database.reservations.splice(index, 1);
    return true;
}

/* ADD NEW RESERVATION */
export function addReservation(reservation) {
    database.reservations.push(reservation);
}

/* TOTAL RESERVATIONS */
export function getTotalReservations() {
    return database.reservations.length;
}

/* ACTIVE RESERVATIONS */
export function getActiveReservations() {
    return database.reservations.filter(
        reservation => reservation.status === "Active"
    );
}

/* FINISHED RESERVATIONS */
export function getFinishedReservations() {
    return database.reservations.filter(
        reservation => reservation.status !== "Active"
    );
}

// Objeto por defecto exportado para resolver 'import db from ...'
const db = {
    database,
    query: database.query,
    define: database.define,
    getReservations,
    getReservationByPlate,
    getReservationById,
    updateReservationHours,
    updateReservationStatus,
    deleteReservation,
    addReservation,
    getTotalReservations,
    getActiveReservations,
    getFinishedReservations
};

export default db;