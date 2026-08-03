// src/routes/zone-routes.js
const express = require('express');
const router = express.Router();
const { renderAvailableAreas } = require('../controllers/zone-controller');

// Ruta principal a la que accede el usuario tras iniciar sesión
router.get('/available-areas', renderAvailableAreas);

module.exports = router;