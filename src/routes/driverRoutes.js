import express from 'express';
import { requireRole } from '../middlewares/auth.js';
import { renderHome, homeData } from '../controllers/driverController.js';
import { renderStartParking } from '../controllers/parkingStartController.js';
import { renderExtendTime } from '../controllers/extendTimeController.js';

const router = express.Router();
const driverOnly = requireRole('driver');

router.get('/zones', driverOnly, renderHome);                                                                       // HU-003
router.get('/zones/data', driverOnly, homeData);                                                                    // HU-003 (auto-refresco)
router.get('/parking/start', driverOnly, renderStartParking);                                                       // HU-004
router.get('/parking/extend', driverOnly, renderExtendTime);                                                       // HU-005

export default router;