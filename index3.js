<<<<<<< HEAD
const express = require("express");
const path = require("path");

const app = express();

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Configuración de Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "src", "views"));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, "src", "public")));

// Ruta principal - HU-008
app.get("/", (req, res) => {
    res.render("HU-008", {
        fecha: "",
        mensaje: ""
    });
});

// Ruta HU-007
app.get("/hu-007", (req, res) => {
    res.render("HU-007", {
        multa: {
            estado: "",
            descripcionEstado: "",
            fecha: "",
            ubicacion: "",
            tiempoExcedido: "",
            ubicacionActual: "",
            comentarios: "",
            valor: "",
            numeroMulta: "",
            vehiculo: {
                placa: ""
            }
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
=======
// index.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const zoneRoutes = require('./src/routes/zone-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Vistas Pug
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'pug');

// Archivos Estáticos
app.use(express.static(path.join(__dirname, 'src/public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usar rutas de zonas
app.use('/', zoneRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
>>>>>>> 1aa5b1d (feat(views): implement available areas map view and layout redesign)
});