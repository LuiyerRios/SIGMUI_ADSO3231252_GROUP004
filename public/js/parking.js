

const parkingMap =
    document.getElementById("parkingMap");


const spaceName =
    document.getElementById("spaceName");


const spaceStatus =
    document.getElementById("spaceStatus");


const vehicleNumber =
    document.getElementById("vehicleNumber");


const ownerName =
    document.getElementById("ownerName");


const entryTime =
    document.getElementById("entryTime");


const description =
    document.getElementById("description");


const zoneName =
    document.getElementById("zoneName");


const occupancy =
    document.getElementById("occupancy");


const availableCount =
    document.getElementById("availableCount");


const bookingCount =
    document.getElementById("bookingCount");


const availableButton =
    document.querySelector(
        ".available-button"
    );


const occupiedButton =
    document.querySelector(
        ".occupied-button"
    );


const confirmButton =
    document.getElementById(
        "confirmChanges"
    );


const message =
    document.getElementById(
        "message"
    );


const toggleSidebar =
    document.getElementById(
        "toggleSidebar"
    );


const app =
    document.querySelector(
        ".app"
    );


/* ==========================================
   VALIDACIÓN
========================================== */

if (!parkingMap) {

    console.error(
        "No se encontró #parkingMap"
    );

}


/* ==========================================
   DATOS DE LOS ESPACIOS
========================================== */

const spaces = [];


/*
Cada zona tiene 10 espacios:

A1 - A10
B1 - B10
C1 - C10
D1 - D10
*/

const zones = [
    "A",
    "B",
    "C",
    "D"
];


zones.forEach(zone => {

    for (
        let number = 1;
        number <= 10;
        number++
    ) {

        const isOccupied =

            Math.random() > 0.65;


        spaces.push({

            id:
                `${zone}${number}`,

            zone:
                zone,

            status:

                isOccupied

                    ? "occupied"

                    : "available",


            vehicle:

                isOccupied

                    ? `ABC-${100 + number}`

                    : "---",


            owner:

                isOccupied

                    ? "John Doe"

                    : "---",


            entry:

                isOccupied

                    ? "08:30 AM"

                    : "---",


            description:

                isOccupied

                    ? "Vehicle currently parked"

                    : "Space available"

        });

    }

});


/* ==========================================
   ESPACIO SELECCIONADO
========================================== */

let selectedSpace = null;


/*
Este valor guarda el cambio temporal.

El color no cambia hasta que se presiona:

Confirm Changes
*/

let selectedStatus = null;


/* ==========================================
   CREAR EL MAPA
========================================== */

function renderParking() {

    if (!parkingMap) {

        return;

    }


    parkingMap.innerHTML = "";


    spaces.forEach(space => {


        const element =

            document.createElement(
                "button"
            );


        element.type =
            "button";


        /*
        Estas clases son importantes:

        parking-space
        available

        o:

        parking-space
        occupied
        */

        element.className =

            `parking-space ${space.status}`;


        element.textContent =
            space.id;


        element.setAttribute(

            "aria-label",

            `Parking space ${space.id}`

        );


        element.addEventListener(

            "click",

            function () {

                selectSpace(

                    space,

                    element

                );

            }

        );


        parkingMap.appendChild(
            element
        );

    });


    updateStatistics();

}


/* ==========================================
   SELECCIONAR ESPACIO
========================================== */

function selectSpace(
    space,
    element
) {


    /*
    Quitar la selección anterior
    */

    const allSpaces =

        document.querySelectorAll(
            ".parking-space"
        );


    allSpaces.forEach(item => {

        item.classList.remove(
            "selected"
        );

    });


    /*
    Marcar el espacio seleccionado
    */

    element.classList.add(
        "selected"
    );


    /*
    Guardar el espacio seleccionado
    */

    selectedSpace =
        space;


    /*
    El estado temporal inicia con
    el estado actual
    */

    selectedStatus =
        space.status;


    /*
    Mostrar nombre
    */

    if (spaceName) {

        spaceName.textContent =
            space.id;

    }


    /*
    Mostrar estado
    */

    if (spaceStatus) {

        spaceStatus.textContent =

            space.status ===
            "available"

                ? "Available"

                : "Occupied";

    }


    /*
    Mostrar vehículo
    */

    if (vehicleNumber) {

        vehicleNumber.textContent =

            space.status ===
            "occupied"

                ? space.vehicle

                : "---";

    }


    /*
    Mostrar propietario
    */

    if (ownerName) {

        ownerName.textContent =

            space.status ===
            "occupied"

                ? space.owner

                : "---";

    }


    /*
    Mostrar hora
    */

    if (entryTime) {

        entryTime.textContent =

            space.status ===
            "occupied"

                ? space.entry

                : "---";

    }


    /*
    Mostrar descripción
    */

    if (description) {

        description.textContent =

            space.status ===
            "occupied"

                ? "Vehicle currently parked"

                : "Space available";

    }


    /*
    Mostrar zona
    */

    if (zoneName) {

        zoneName.textContent =
            space.zone;

    }


    /*
    Actualizar botones
    */

    updateStatusButtons();


    /*
    Limpiar mensaje anterior
    */

    if (message) {

        message.textContent = "";

    }

}


/* ==========================================
   ACTUALIZAR BOTONES
========================================== */

function updateStatusButtons() {


    if (availableButton) {

        availableButton
            .classList
            .toggle(

                "active",

                selectedStatus ===
                "available"

            );

    }


    if (occupiedButton) {

        occupiedButton
            .classList
            .toggle(

                "active",

                selectedStatus ===
                "occupied"

            );

    }

}


/* ==========================================
   BOTÓN AVAILABLE
========================================== */

if (availableButton) {

    availableButton.addEventListener(

        "click",

        function () {


            /*
            Verificar selección
            */

            if (!selectedSpace) {

                showMessage(

                    "Seleccione primero un espacio.",

                    "error"

                );

                return;

            }


            /*
            Cambio temporal
            */

            selectedStatus =
                "available";


            updateStatusButtons();


            /*
            Mostrar estado temporal
            */

            if (spaceStatus) {

                spaceStatus.textContent =
                    "Available";

            }

        }

    );

}


/* ==========================================
   BOTÓN OCCUPIED
========================================== */

if (occupiedButton) {

    occupiedButton.addEventListener(

        "click",

        function () {


            /*
            Verificar selección
            */

            if (!selectedSpace) {

                showMessage(

                    "Seleccione primero un espacio.",

                    "error"

                );

                return;

            }


            /*
            Cambio temporal
            */

            selectedStatus =
                "occupied";


            updateStatusButtons();


            /*
            Mostrar estado temporal
            */

            if (spaceStatus) {

                spaceStatus.textContent =
                    "Occupied";

            }

        }

    );

}


/* ==========================================
   CONFIRMAR CAMBIOS
========================================== */

if (confirmButton) {

    confirmButton.addEventListener(

        "click",

        function () {


            /*
            Verificar que haya un espacio
            */

            if (!selectedSpace) {

                showMessage(

                    "Seleccione primero un espacio.",

                    "error"

                );

                return;

            }


            /*
            Guardar el nuevo estado
            */

            selectedSpace.status =
                selectedStatus;


            /*
            Actualizar datos según estado
            */

            if (

                selectedStatus ===
                "available"

            ) {


                selectedSpace.vehicle =
                    "---";


                selectedSpace.owner =
                    "---";


                selectedSpace.entry =
                    "---";


                selectedSpace.description =
                    "Space available";

            }


            if (

                selectedStatus ===
                "occupied"

            ) {


                selectedSpace.vehicle =
                    "ABC-123";


                selectedSpace.owner =
                    "John Doe";


                selectedSpace.entry =
                    "08:30 AM";


                selectedSpace.description =
                    "Vehicle currently parked";

            }


            /*
            Crear nuevamente el mapa.

            Aquí se produce el cambio:

            Verde -> Rojo

            o:

            Rojo -> Verde
            */

            renderParking();


            /*
            Volver a marcar el espacio
            */

            const updatedElement =

                Array
                .from(

                    document.querySelectorAll(
                        ".parking-space"
                    )

                )
                .find(

                    item =>

                        item.textContent ===

                        selectedSpace.id

                );


            if (updatedElement) {

                updatedElement
                    .classList
                    .add(
                        "selected"
                    );

            }


            /*
            Actualizar información
            */

            updateDetails();


            /*
            Mostrar éxito
            */

            showMessage(

                "El cambio fue realizado correctamente.",

                "success"

            );

        }

    );

}


/* ==========================================
   ACTUALIZAR PANEL
========================================== */

function updateDetails() {


    if (!selectedSpace) {

        return;

    }


    if (spaceStatus) {

        spaceStatus.textContent =

            selectedSpace.status ===
            "available"

                ? "Available"

                : "Occupied";

    }


    if (vehicleNumber) {

        vehicleNumber.textContent =

            selectedSpace.vehicle;

    }


    if (ownerName) {

        ownerName.textContent =

            selectedSpace.owner;

    }


    if (entryTime) {

        entryTime.textContent =

            selectedSpace.entry;

    }


    if (description) {

        description.textContent =

            selectedSpace.description;

    }


    if (zoneName) {

        zoneName.textContent =

            selectedSpace.zone;

    }

}


function updateStatistics() {


    const occupiedSpaces =

        spaces.filter(

            space =>

                space.status ===
                "occupied"

        ).length;


    const freeSpaces =

        spaces.length
        -
        occupiedSpaces;


    const occupancyPercentage =

        Math.round(

            (
                occupiedSpaces
                /
                spaces.length
            )

            *
            100

        );



    if (occupancy) {

        occupancy.textContent =

            `${occupancyPercentage}%`;

    }




    if (availableCount) {

        availableCount.textContent =
            freeSpaces;

    }



    if (bookingCount) {

        bookingCount.textContent =
            occupiedSpaces;

    }

}



function showMessage(
    text,
    type
) {


    if (!message) {

        return;

    }


    message.textContent =
        text;


    if (

        type ===
        "success"

    ) {

        message.style.color =
            "#16824a";

    }


    if (

        type ===
        "error"

    ) {

        message.style.color =
            "#d63031";

    }




    setTimeout(

        function () {

            message.textContent =
                "";

        },

        4000

    );

}




if (

    toggleSidebar
    &&
    app

) {

    toggleSidebar.addEventListener(

        "click",

        function () {


            app
                .classList
                .toggle(

                    "sidebar-hidden"

                );


      

            if (

                app
                .classList
                .contains(
                    "sidebar-hidden"
                )

            ) {

                toggleSidebar.textContent =
                    "☰";

            }

            else {

                toggleSidebar.textContent =
                    "☰";

            }

        }

    );

}
/* ==========================================
   MODO OSCURO / CLARO
========================================== */

const themeButton = document.getElementById("themeToggle");
const appContainer = document.querySelector(".app");


if (themeButton && appContainer) {


    const currentTheme = localStorage.getItem("theme");


    if (currentTheme === "dark") {

        appContainer.classList.add("dark-mode");

        themeButton.textContent =
            "☀️ Modo claro";

    }



    themeButton.addEventListener(
        "click",
        function(){

            appContainer.classList.toggle(
                "dark-mode"
            );


            if(
                appContainer.classList.contains(
                    "dark-mode"
                )
            ){

                localStorage.setItem(
                    "theme",
                    "dark"
                );

                themeButton.textContent =
                    "☀️ Modo claro";

            }
            else{

                localStorage.setItem(
                    "theme",
                    "light"
                );

                themeButton.textContent =
                    "🌙 Modo oscuro";

            }

        }
    );

}



renderParking();