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
});