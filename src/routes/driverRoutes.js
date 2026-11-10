import { Router } from 'express';
import { driverOnly } from '../middlewares/authMiddleware.js';
import { renderHome, homeData } from '../controllers/driverController.js';

const router = Router();

// HU-003: Find a space
router.get('/zones', driverOnly, renderHome);
router.get('/zones/data', driverOnly, homeData);

export default router;