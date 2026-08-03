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
});