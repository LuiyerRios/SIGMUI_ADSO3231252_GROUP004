import express from 'express';
import { renderVerify, renderNewFine } from '../controllers/agentController.js';

const router = express.Router();

router.get('/', (req, res) => res.redirect('/agent/verify'));
router.get('/verify', renderVerify);          // HU-006
router.get('/fines/new', renderNewFine);      // HU-007

export default router;
