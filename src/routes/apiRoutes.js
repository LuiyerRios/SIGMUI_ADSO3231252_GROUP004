import { Router } from 'express';
import { getAdminSpaces, getAdminStats } from '../services/adminParkingService.js';
import db from '../config/db.js';
import { QueryTypes } from 'sequelize';

const router = Router();

// GET /api/parking-spaces
router.get('/parking-spaces', async (req, res) => {
  try {
    const spaces = await getAdminSpaces();
    const stats = await getAdminStats();
    res.json({ spaces, stats });
  } catch (err) {
    console.error('Error fetching parking spaces API:', err);
    res.status(500).json({ error: 'Failed to fetch parking spaces.' });
  }
});

// PUT /api/parking-spaces/:id
router.put('/parking-spaces/:id', async (req, res) => {
  try {
    const spaceId = req.params.id;
    const { status } = req.body;

    // Verificar si el espacio tiene una sesión activa pagada
    const [activeSession] = await db.query(`
      SELECT id FROM parking_sessions
      WHERE space_id = :spaceId
        AND status = 'active'
        AND payment_status = 'paid'
        AND end_time > NOW()
      LIMIT 1
    `, {
      replacements: { spaceId },
      type: QueryTypes.SELECT
    });

    if (activeSession) {
      return res.status(409).json({ error: 'This space has an active parking session.' });
    }

    await db.query(`
      UPDATE parking_spaces 
      SET status = :status 
      WHERE id = :spaceId
    `, {
      replacements: { status: status === 'occupied' ? 'occupied' : 'available', spaceId },
      type: QueryTypes.UPDATE
    });

    res.json({ success: true, message: 'Space status updated.' });
  } catch (err) {
    console.error('Error updating space status:', err);
    res.status(500).json({ error: 'Failed to update space status.' });
  }
});

// POST /api/parking-config
router.post('/parking-config', async (req, res) => {
  try {
    const { spacesPerZone, zones } = req.body;

    // Verificar si existe CUALQUIER sesión activa pagada antes de redimensionar
    const [activeSessions] = await db.query(`
      SELECT COUNT(*) AS total FROM parking_sessions
      WHERE status = 'active'
        AND payment_status = 'paid'
        AND end_time > NOW()
    `, { type: QueryTypes.SELECT });

    if (activeSessions && Number(activeSessions.total) > 0) {
      return res.status(409).json({ error: 'You cannot resize the map while there are active parking sessions.' });
    }

    // Proceder con la reconfiguración si no hay sesiones activas
    const zonesList = JSON.stringify(zones || ['A', 'B', 'C', 'D']);
    await db.query(`
      UPDATE parking_config 
      SET spaces_per_zone = :spacesPerZone, zones_list = :zonesList
    `, {
      replacements: { spacesPerZone: Number(spacesPerZone) || 32, zonesList },
      type: QueryTypes.UPDATE
    });

    // Reconstruir tabla parking_spaces
    await db.query(`DELETE FROM parking_spaces`);

    const parsedZones = Array.isArray(zones) ? zones : JSON.parse(zonesList);
    const count = Number(spacesPerZone) || 32;

    for (const z of parsedZones) {
      for (let i = 1; i <= count; i++) {
        await db.query(`
          INSERT INTO parking_spaces (id, zone, status) 
          VALUES (:id, :zone, 'available')
        `, {
          replacements: { id: `${z}${i}`, zone: z },
          type: QueryTypes.INSERT
        });
      }
    }

    res.json({ success: true, message: 'Parking map resized successfully.' });
  } catch (err) {
    console.error('Error updating parking config:', err);
    res.status(500).json({ error: 'Failed to update parking configuration.' });
  }
});

export default router;