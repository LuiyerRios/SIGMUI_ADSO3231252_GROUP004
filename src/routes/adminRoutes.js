import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('HU-010');
});

export default router;