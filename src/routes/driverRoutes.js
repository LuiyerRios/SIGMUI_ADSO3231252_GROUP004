import express from 'express';
import { requireRole } from '../middlewares/auth.js';
import { renderAvailableAreas } from '../controllers/zone-controller.js';

const router = express.Router();
const driverOnly = requireRole('driver');

router.get('/zones', driverOnly, renderAvailableAreas);                                                         // HU-003
router.get('/parking/start', driverOnly, (req, res) => res.render('HU-004', { title: 'Start parking | SIGMUI' }));  // HU-004
router.get('/parking/extend', driverOnly, (req, res) => res.render('HU-005', { title: 'Extend time | SIGMUI' }));  // HU-005

export default router;
