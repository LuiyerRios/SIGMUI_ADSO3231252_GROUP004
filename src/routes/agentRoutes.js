import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.redirect('/agent/verify'));
router.get('/verify', (req, res) => res.render('HU-006', { title: 'Vehicle inspection | SIGMUI' }));   // HU-006
router.get('/fines/new', (req, res) => res.render('HU-007', {                                          // HU-007
  title: 'Digital fine | SIGMUI',
  multa: {
    estado: '', descripcionEstado: '', fecha: '', ubicacion: '', tiempoExcedido: '',
    ubicacionActual: '', comentarios: '', valor: '', numeroMulta: '', vehiculo: { placa: '' }
  }
}));

export default router;
