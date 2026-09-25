import express from 'express';
import { renderAvailableAreas } from '../controllers/zone-controller.js';

const router = express.Router();

// Ruta principal a la que accede el usuario tras iniciar sesión (/zones/available-areas)
router.get('/available-areas', renderAvailableAreas);

export default router;