const express = require("express");
const path = require("path");

const app = express();

// Puerto del servidor (NO es el puerto de MySQL)
const PORT = process.env.PORT || 3000;

// Configuración de Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "src", "views"));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, "src", "public")));

// Ruta principal
app.get("/", (req, res) => {
    res.render("HU-008", {
        fecha: "",
        mensaje: ""
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});