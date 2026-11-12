import express from 'express';
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { requireRole } from '../middlewares/auth.js';
import { getAdminSpaces, getAdminStats, getConfig } from '../services/adminParkingService.js';

const router = express.Router();
const adminOnly = requireRole('admin');   // Todas estas rutas son solo del admin
const VALID_STATUS = ['available', 'occupied'];

// Sesión activa pagada sobre un espacio (o en cualquier espacio si spaceId es null)
const ACTIVE_SESSION_WHERE = `status = 'active' AND payment_status = 'paid' AND end_time > NOW()`;

// HU-010: espacios con su ocupación real + tarjetas de resumen
router.get('/parking-spaces', adminOnly, async (req, res) => {
  try {
    const [spaces, stats] = await Promise.all([getAdminSpaces(), getAdminStats()]);
    res.json({ spaces, stats });
  } catch (error) {
    console.error('GET /api/parking-spaces:', error.message);
    res.status(500).json({ error: 'The system cannot retrieve parking data.' });
  }
});

// HU-010: configuración actual del mapa
router.get('/parking-config', adminOnly, async (req, res) => {
  try {
    res.json(await getConfig());
  } catch (error) {
    console.error('GET /api/parking-config:', error.message);
    res.status(500).json({ error: 'The system cannot retrieve parking data.' });
  }
});

// HU-010: cambiar el estado manual de un espacio
router.put('/parking-spaces/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;

  if (!/^[A-F]\d{1,2}$/.test(id) || !VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Invalid space or status.' });
  }

  try {
    // Un espacio con sesión pagada vigente no se puede marcar como libre
    if (status === 'available') {
      const [active] = await db.query(
        `SELECT id FROM parking_sessions WHERE space_id = :id AND ${ACTIVE_SESSION_WHERE} LIMIT 1`,
        { replacements: { id }, type: QueryTypes.SELECT }
      );
      if (active) {
        return res.status(409).json({ error: 'This space has an active parking session.' });
      }
    }

    const [, affected] = await db.query(
      `UPDATE parking_spaces
       SET status = :status,
           description = :description,
           entry_time = IF(:status = 'occupied', COALESCE(entry_time, NOW()), NULL),
           vehicle_id = IF(:status = 'occupied', vehicle_id, NULL)
       WHERE id = :id`,
      { replacements: { id, status, description: status === 'occupied' ? 'Vehicle parked' : 'Space available' } }
    );

    if (affected && affected.affectedRows === 0) {
      return res.status(404).json({ error: 'Invalid space or status.' });
    }

    res.json({ message: `Space ${id} updated successfully.` });
  } catch (error) {
    console.error('PUT /api/parking-spaces:', error.message);
    res.status(500).json({ error: 'Changes cannot be saved due to system failure.' });
  }
});

// HU-010: redimensionar el mapa (borra y vuelve a crear los espacios)
router.post('/parking-config', adminOnly, async (req, res) => {
  const body = req.body ?? {};
  const spacesPerZone = Number.parseInt(body.spacesPerZone, 10);
  const rawZones = Array.isArray(body.zones) ? body.zones : String(body.zones || '').split(',');
  const zones = [...new Set(rawZones.map((z) => String(z).trim().toUpperCase()).filter((z) => /^[A-F]$/.test(z)))];

  if (!Number.isInteger(spacesPerZone) || spacesPerZone < 1 || spacesPerZone > 50 || zones.length === 0) {
    return res.status(400).json({ error: 'Invalid configuration: 1-50 spaces and zones A-F.' });
  }

  const t = await db.transaction();
  try {
    // No se puede redimensionar con conductores parqueados (sus sesiones quedarían sin espacio)
    const [active] = await db.query(
      `SELECT COUNT(*) AS total FROM parking_sessions WHERE ${ACTIVE_SESSION_WHERE} FOR UPDATE`,
      { type: QueryTypes.SELECT, transaction: t }
    );
    if (Number(active.total) > 0) {
      await t.rollback();
      return res.status(409).json({ error: 'You cannot resize the map while there are active parking sessions.' });
    }

    // zones_list se guarda como texto separado por comas: 'A,B,C,D'
    await db.query(
      `INSERT INTO parking_config (id, spaces_per_zone, zones_list) VALUES (1, :spacesPerZone, :zonesList)
       ON DUPLICATE KEY UPDATE spaces_per_zone = :spacesPerZone, zones_list = :zonesList`,
      { replacements: { spacesPerZone, zonesList: zones.join(',') }, transaction: t }
    );
    await db.query('DELETE FROM parking_spaces', { transaction: t });

    const placeholders = [];
    const values = [];
    zones.forEach((zone) => {
      for (let n = 1; n <= spacesPerZone; n++) {
        placeholders.push('(?, ?)');
        values.push(`${zone}${n}`, zone);
      }
    });
    await db.query(`INSERT INTO parking_spaces (id, zone) VALUES ${placeholders.join(', ')}`, { replacements: values, transaction: t });

    await t.commit();
    res.json({ message: 'Parking capacity and layout successfully reconfigured.' });
  } catch (error) {
    await t.rollback();
    console.error('POST /api/parking-config:', error.message);
    res.status(500).json({ error: 'Changes cannot be saved due to system failure.' });
  }
});

export default router;