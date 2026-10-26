import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.render('HU-010', { title: 'Admin | SIGMUI' }));                          // HU-010
router.get('/dashboard', (req, res) => res.render('HU-008', { title: 'Administrative dashboard | SIGMUI' }));  // HU-008

export default router;
