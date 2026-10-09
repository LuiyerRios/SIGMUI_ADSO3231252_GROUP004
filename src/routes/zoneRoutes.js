import express from 'express';
import { renderAvailableAreas } from '../controllers/zone-controller.js';

const router = express.Router();

// Si entran a /zones, redirige a la URL /available-areas
router.get('/zones', (req, res) => {
  res.redirect('/available-areas');
});

// Rutas que ejecutan el controlador y muestran la vista HU-003
router.get('/', renderAvailableAreas);
router.get('/available-areas', renderAvailableAreas);
router.get('/zones/available-areas', renderAvailableAreas);

export default router;