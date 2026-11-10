import db from '../config/db.js';
import { QueryTypes } from 'sequelize';
import { SQL_OCCUPIED_EXISTS } from './driverParkingService.js';

/**
 * Obtiene todos los espacios de parqueo para el mapa de administración,
 * indicando si están ocupados (por sesión activa o por cambio manual)
 * y trayendo la información de la sesión vigente en caso de existir.
 */
export async function getAdminSpaces() {
  const query = `
    SELECT 
      ps.id,
      ps.zone,
      ${SQL_OCCUPIED_EXISTS} AS isOccupied,
      CASE 
        WHEN s.id IS NOT NULL THEN 'session'
        WHEN ps.status = 'occupied' THEN 'manual'
        ELSE NULL
      END AS source,
      s.plate,
      u.full_name AS owner,
      s.start_time AS startTime,
      s.end_time AS endTime,
      s.receipt_number AS receiptNumber
    FROM parking_spaces ps
    LEFT JOIN parking_sessions s ON s.space_id = ps.id 
      AND s.status = 'active' 
      AND s.payment_status = 'paid' 
      AND s.end_time > NOW()
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY ps.zone ASC, CHAR_LENGTH(ps.id) ASC, ps.id ASC
  `;

  const rows = await db.query(query, { type: QueryTypes.SELECT });

  return rows.map(r => ({
    id: r.id,
    zone: r.zone,
    occupied: Boolean(r.isOccupied),
    source: r.source,
    plate: r.plate || null,
    owner: r.owner || null,
    startTime: r.startTime ? new Date(r.startTime).toISOString() : null,
    endTime: r.endTime ? new Date(r.endTime).toISOString() : null,
    receiptNumber: r.receiptNumber || null
  }));
}

/**
 * Obtiene las métricas globales para las tarjetas superiores del Admin (HU-010).
 */
export async function getAdminStats() {
  const spaces = await getAdminSpaces();
  const total = spaces.length;
  const occupied = spaces.filter(s => s.occupied).length;
  const free = total - occupied;
  const occupancyPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

  // Conteo de zonas únicas
  const zonesCount = new Set(spaces.map(s => s.zone)).size;

  // Reservas/Sesiones de hoy (sesiones pagadas iniciadas hoy)
  const [bookingsRes] = await db.query(`
    SELECT COUNT(*) AS total
    FROM parking_sessions
    WHERE payment_status = 'paid'
      AND DATE(start_time) = CURDATE()
  `, { type: QueryTypes.SELECT });

  const todayBookings = Number(bookingsRes ? bookingsRes.total : 0);

  // Ingresos de hoy (suma de sesiones pagadas creadas hoy + extensiones creadas hoy)
  const [sessionRev] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM parking_sessions
    WHERE payment_status = 'paid'
      AND DATE(start_time) = CURDATE()
  `, { type: QueryTypes.SELECT });

  const [extRev] = await db.query(`
    SELECT COALESCE(SUM(se.amount), 0) AS total
    FROM session_extensions se
    JOIN parking_sessions ps ON se.session_id = ps.id
    WHERE ps.payment_status = 'paid'
      AND DATE(se.created_at) = CURDATE()
  `, { type: QueryTypes.SELECT });

  const todayRevenue = Number(sessionRev.total) + Number(extRev.total);

  return {
    total,
    free,
    occupied,
    occupancyPercent,
    zonesCount,
    todayBookings,
    todayRevenue
  };
}

/**
 * Obtiene la configuración actual del mapa de parqueo.
 */
export async function getConfig() {
  const [config] = await db.query(`
    SELECT spaces_per_zone AS spacesPerZone, zones_list AS zonesList
    FROM parking_config
    LIMIT 1
  `, { type: QueryTypes.SELECT });

  if (!config) {
    return { spacesPerZone: 32, zones: ['A', 'B', 'C', 'D'] };
  }

  return {
    spacesPerZone: config.spacesPerZone,
    zones: typeof config.zonesList === 'string' ? JSON.parse(config.zonesList) : config.zonesList
  };
}