import express from 'express';
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
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

// HU-014 · Configuración del perfil del conductor (siempre del usuario en sesión)
router.get('/settings', driverOnly, async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT id, full_name, email, phone FROM users WHERE id = :id LIMIT 1',
      { replacements: { id: req.session.user.id }, type: QueryTypes.SELECT }
    );
    if (!user) return res.redirect('/logout');

    user.avatar_initials = user.full_name
      .split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

    res.render('HU-014', {
      title: 'Profile settings | SIGMUI',
      user,
      success: req.query.success === '1',
      errorMessage: null
    });
  } catch (error) {
    console.error('Error loading profile settings (HU-014):', error);
    res.status(500).render('errors/error', { title: 'Error', code: 500, message: 'The profile is temporarily unavailable.' });
  }
});

router.post('/settings/profile', driverOnly, async (req, res) => {
  const fullName = String(req.body.full_name ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();

  // Validación básica: nombre 3-100 caracteres; teléfono opcional con dígitos, espacios, + y -
  if (fullName.length < 3 || fullName.length > 100 || (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone))) {
    return res.redirect('/settings?error=1');
  }

  try {
    await db.query(
      'UPDATE users SET full_name = :fullName, phone = :phone WHERE id = :id',
      { replacements: { fullName, phone: phone || null, id: req.session.user.id } }
    );
    req.session.user.name = fullName; // el sidebar y el saludo muestran el nombre nuevo
    res.redirect('/settings?success=1');
  } catch (error) {
    console.error('Error updating profile (HU-014):', error);
    res.redirect('/settings?error=1');
  }
});

export default router;