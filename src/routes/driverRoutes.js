import express from 'express';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { requireRole } from '../middlewares/auth.js';
import { renderHome, homeData } from '../controllers/driverController.js';
import { renderStartParking } from '../controllers/parkingStartController.js';
import { renderExtendTime } from '../controllers/extendTimeController.js';
import {
  validateProfile,
  validatePasswordChange,
  validateVehicle,
  SETTINGS_MESSAGES,
  SETTINGS_TABS
} from '../utils/settingsRules.js';

const router = express.Router();
const driverOnly = requireRole('driver');

router.get('/zones', driverOnly, renderHome);                                                                       // HU-003
router.get('/zones/data', driverOnly, homeData);                                                                    // HU-003 (auto-refresco)
router.get('/parking/start', driverOnly, renderStartParking);                                                       // HU-004
router.get('/parking/extend', driverOnly, renderExtendTime);                                                       // HU-005

// ===================== HU-014 · Settings (perfil, contraseña y vehículos del usuario en sesión) =====================

// Redirige a la pestaña con un código de éxito o error (?ok= / ?error=); el texto lo pone SETTINGS_MESSAGES
const go = (res, tab, kind, code) => res.redirect(`/settings?tab=${tab}&${kind}=${code}`);

// GET /settings?tab=profile|password|vehicles
router.get('/settings', driverOnly, async (req, res) => {
  const userId = req.session.user.id;
  const tab = SETTINGS_TABS.includes(req.query.tab) ? req.query.tab : 'profile';

  try {
    const [[user], vehicles] = await Promise.all([
      db.query(
        'SELECT id, full_name, email, phone, email_verified_at, created_at FROM users WHERE id = :id LIMIT 1',
        { replacements: { id: userId }, type: QueryTypes.SELECT }
      ),
      db.query(
        `SELECT v.id, v.plate, v.brand_model,
                EXISTS (
                  SELECT 1 FROM parking_sessions s
                  WHERE s.plate = v.plate AND s.status = 'active'
                    AND s.payment_status = 'paid' AND s.end_time > NOW()
                ) AS has_active_session
           FROM vehicles v
          WHERE v.user_id = :id
          ORDER BY v.created_at, v.id`,
        { replacements: { id: userId }, type: QueryTypes.SELECT }
      )
    ]);
    if (!user) return res.redirect('/logout');

    user.avatar_initials = user.full_name
      .split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

    const okText = SETTINGS_MESSAGES.ok[req.query.ok] || null;
    const errorText = SETTINGS_MESSAGES.error[req.query.error] || null;

    res.render('HU-014', {
      title: 'Settings | SIGMUI',
      activeMenu: 'settings',
      pageTitle: 'Settings',
      pageSubtitle: 'Your account, password and vehicles',
      tab,
      user,
      vehicles: vehicles.map(v => ({ ...v, has_active_session: Boolean(Number(v.has_active_session)) })),
      vehicleCount: vehicles.length,
      memberSince: new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      successMessage: okText,
      errorMessage: errorText
    });
  } catch (error) {
    console.error('Error loading settings (HU-014):', error);
    res.status(500).render('errors/error', { title: 'Error', code: 500, message: 'The settings are temporarily unavailable.' });
  }
});

// POST /settings/profile
router.post('/settings/profile', driverOnly, async (req, res) => {
  const { value, error } = validateProfile(req.body);
  if (error) return go(res, 'profile', 'error', error);

  try {
    await db.query(
      'UPDATE users SET full_name = :fullName, phone = :phone WHERE id = :id',
      { replacements: { ...value, id: req.session.user.id } }
    );
    req.session.user.name = value.fullName; // el sidebar y el saludo muestran el nombre nuevo
    go(res, 'profile', 'ok', 'profile');
  } catch (err) {
    console.error('Error updating profile (HU-014):', err);
    go(res, 'profile', 'error', 'server');
  }
});

// POST /settings/password
router.post('/settings/password', driverOnly, async (req, res) => {
  const { value, error } = validatePasswordChange(req.body);
  if (error) return go(res, 'password', 'error', error);

  try {
    const [user] = await db.query(
      'SELECT password FROM users WHERE id = :id LIMIT 1',
      { replacements: { id: req.session.user.id }, type: QueryTypes.SELECT }
    );
    if (!user || !(await bcrypt.compare(value.currentPassword, user.password))) {
      return go(res, 'password', 'error', 'password_current');
    }

    const hash = await bcrypt.hash(value.newPassword, 10);
    await db.query('UPDATE users SET password = :hash WHERE id = :id', {
      replacements: { hash, id: req.session.user.id }
    });
    go(res, 'password', 'ok', 'password');
  } catch (err) {
    console.error('Error changing password (HU-014):', err);
    go(res, 'password', 'error', 'server');
  }
});

// POST /settings/vehicles
router.post('/settings/vehicles', driverOnly, async (req, res) => {
  const { value, error } = validateVehicle(req.body);
  if (error) return go(res, 'vehicles', 'error', error);

  try {
    const [existing] = await db.query('SELECT id FROM vehicles WHERE plate = :plate LIMIT 1', {
      replacements: { plate: value.plate }, type: QueryTypes.SELECT
    });
    if (existing) return go(res, 'vehicles', 'error', 'plate_taken');

    await db.query(
      'INSERT INTO vehicles (user_id, plate, brand_model) VALUES (:userId, :plate, :brandModel)',
      { replacements: { ...value, userId: req.session.user.id } }
    );
    go(res, 'vehicles', 'ok', 'vehicle_added');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return go(res, 'vehicles', 'error', 'plate_taken');
    console.error('Error adding vehicle (HU-014):', err);
    go(res, 'vehicles', 'error', 'server');
  }
});

// POST /settings/vehicles/:id/delete
router.post('/settings/vehicles/:id/delete', driverOnly, async (req, res) => {
  const vehicleId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(vehicleId)) return go(res, 'vehicles', 'error', 'vehicle_not_found');

  try {
    // Solo vehículos del usuario en sesión
    const [vehicle] = await db.query(
      'SELECT id, plate FROM vehicles WHERE id = :id AND user_id = :userId LIMIT 1',
      { replacements: { id: vehicleId, userId: req.session.user.id }, type: QueryTypes.SELECT }
    );
    if (!vehicle) return go(res, 'vehicles', 'error', 'vehicle_not_found');

    const [active] = await db.query(
      `SELECT id FROM parking_sessions
        WHERE plate = :plate AND status = 'active' AND payment_status = 'paid' AND end_time > NOW()
        LIMIT 1`,
      { replacements: { plate: vehicle.plate }, type: QueryTypes.SELECT }
    );
    if (active) return go(res, 'vehicles', 'error', 'vehicle_active');

    // Las sesiones y espacios que lo referencian quedan con vehicle_id NULL (ON DELETE SET NULL); el historial conserva la placa
    await db.query('DELETE FROM vehicles WHERE id = :id AND user_id = :userId', {
      replacements: { id: vehicleId, userId: req.session.user.id }
    });
    go(res, 'vehicles', 'ok', 'vehicle_removed');
  } catch (err) {
    console.error('Error removing vehicle (HU-014):', err);
    go(res, 'vehicles', 'error', 'server');
  }
});

export default router;