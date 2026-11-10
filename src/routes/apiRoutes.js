import express from 'express';
import db from '../config/db.js';
import { requireRole } from '../middlewares/auth.js';

const router = express.Router();
const adminOnly = requireRole('admin');
const VALID_STATUS = ['available', 'occupied'];

// HU-010 / HU-008: listar espacios
router.get('/parking-spaces', adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.zone, p.status, p.description, p.vehicle_id,
             COALESCE(v.plate, '---')     AS vehicle,
             COALESCE(u.full_name, '---') AS owner,
             DATE_FORMAT(p.entry_time, '%h:%i %p') AS entry
      FROM parking_spaces p
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      LEFT JOIN users u    ON v.user_id = u.id
      ORDER BY p.zone ASC, CAST(SUBSTRING(p.id, 2) AS UNSIGNED) ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('GET /api/parking-spaces:', error.message);
    res.status(500).json({ error: 'The system cannot retrieve parking data.' });
  }
});

// HU-010: configuración actual
router.get('/parking-config', adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT spaces_per_zone, zones_list FROM parking_config WHERE id = 1');
    res.json(rows[0] || { spaces_per_zone: 10, zones_list: 'A,B,C,D' });
  } catch (error) {
    res.status(500).json({ error: 'The system cannot retrieve parking data.' });
  }
});

// HU-010: redimensionar el mapa
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

// HU-010: cambiar estado de un espacio
router.put('/parking-spaces/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;

  if (!/^[A-F]\d{1,2}$/.test(id) || !VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Invalid space or status.' });
  }

  try {
    await db.query(
      `UPDATE parking_spaces
       SET status = :status,
           description = :description,
           entry_time = IF(:status = 'occupied', COALESCE(entry_time, NOW()), NULL),
           vehicle_id = IF(:status = 'occupied', vehicle_id, NULL)
       WHERE id = :id`,
      { replacements: { id, status, description: status === 'occupied' ? 'Vehicle parked' : 'Space available' } }
    );
    res.json({ message: `Space ${id} updated successfully.` });
  } catch (error) {
    console.error('PUT /api/parking-spaces:', error.message);
    res.status(500).json({ error: 'Changes cannot be saved due to system failure.' });
  }
});

export default router;
