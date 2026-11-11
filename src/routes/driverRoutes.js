import express from 'express';
import { requireRole } from '../middlewares/auth.js';
import { renderAvailableAreas } from '../controllers/zone-controller.js';
import db from '../config/db.js'; // <--- 1. Importa tu conexión a MySQL

const router = express.Router();
const driverOnly = requireRole('driver');

router.get('/zones', driverOnly, renderAvailableAreas); // HU-003

router.get('/parking/start', driverOnly, (req, res) => {
  res.render('HU-004', { title: 'Start parking | SIGMUI' });
}); // HU-004

router.get('/parking/extend', driverOnly, (req, res) => {
  res.render('HU-005', { title: 'Extend time | SIGMUI' });
}); // HU-005

router.get('/settings', driverOnly, async (req, res) => {
    try {
        const userId = req.session.userId || 1; 

        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const user = rows[0];

        // Generar iniciales automáticas 
        user.avatar_initials = user.full_name
            ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'LR';

        res.render('HU-014', { 
            title: 'Profile Settings | SIGMUI', 
            user 
        });
    } catch (error) {
        console.error('Error al cargar la vista de settings:', error);
        res.status(500).send('Error interno del servidor');
    }
}); // HU-014

//  RUTA POST PARA MySQL)
router.post('/settings/profile', driverOnly, async (req, res) => {
    try {
        const userId = req.session.userId || 1;
        const { full_name, phone } = req.body;

        await db.query(
            'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
            [full_name, phone, userId]
        );

        res.redirect('/settings?success=true');
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(500).send('Error al actualizar los datos');
    }
});

export default router;