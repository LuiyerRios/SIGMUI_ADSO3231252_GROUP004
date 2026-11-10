import db from '../config/db.js';
import { QueryTypes } from 'sequelize';

/**
 * Consulta la regla de ocupación en SQL:
 * Un espacio está ocupado si status = 'occupied' O si existe una sesión de estacionamiento activa,
 * pagada y cuyo end_time > NOW().
 */
export const SQL_OCCUPIED_EXISTS = `
  (ps.status = 'occupied' OR EXISTS (
    SELECT 1 FROM parking_sessions s 
    WHERE s.space_id = ps.id 
      AND s.status = 'active' 
      AND s.payment_status = 'paid' 
      AND s.end_time > NOW()
  ))
`;

/**
 * Obtiene el resumen de zonas que tienen al menos un espacio de parqueo configurado.
 */
export async function getZonesOverview() {
  const query = `
    SELECT 
      z.code,
      z.name,
      z.rate_per_hour AS ratePerHour,
      z.rate_per_day AS ratePerDay,
      z.allows_extension AS allowsExtension,
      COUNT(ps.id) AS total,
      SUM(CASE WHEN NOT ${SQL_OCCUPIED_EXISTS} THEN 1 ELSE 0 END) AS free
    FROM zones z
    JOIN parking_spaces ps ON ps.zone = z.code
    GROUP BY z.code, z.name, z.rate_per_hour, z.rate_per_day, z.allows_extension
    ORDER BY z.code ASC
  `;

  const rows = await db.query(query, { type: QueryTypes.SELECT });

  return rows.map(r => ({
    code: r.code,
    name: r.name,
    ratePerHour: Number(r.ratePerHour),
    ratePerDay: Number(r.ratePerDay),
    allowsExtension: Boolean(r.allowsExtension),
    total: Number(r.total),
    free: Number(r.free)
  }));
}

/**
 * Obtiene todos los espacios pertenecientes a una zona dada, indicando su estado de ocupación real.
 */
export async function getSpaces(zone) {
  const query = `
    SELECT 
      ps.id,
      ps.zone,
      ${SQL_OCCUPIED_EXISTS} AS occupied
    FROM parking_spaces ps
    WHERE ps.zone = :zone
    ORDER BY CHAR_LENGTH(ps.id), ps.id ASC
  `;

  const rows = await db.query(query, {
    replacements: { zone },
    type: QueryTypes.SELECT
  });

  return rows.map(r => ({
    id: r.id,
    zone: r.zone,
    occupied: Boolean(r.occupied)
  }));
}

/**
 * Obtiene el total consolidado de plazas, plazas ocupadas, libres y porcentaje global de ocupación.
 */
export async function getTotals() {
  const query = `
    SELECT 
      COUNT(ps.id) AS total,
      SUM(CASE WHEN NOT ${SQL_OCCUPIED_EXISTS} THEN 1 ELSE 0 END) AS free,
      SUM(CASE WHEN ${SQL_OCCUPIED_EXISTS} THEN 1 ELSE 0 END) AS occupied
    FROM parking_spaces ps
  `;

  const [res] = await db.query(query, { type: QueryTypes.SELECT });
  const total = Number(res.total) || 0;
  const free = Number(res.free) || 0;
  const occupied = Number(res.occupied) || 0;
  const occupancyPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return { total, free, occupied, occupancyPercent };
}

/**
 * Obtiene las sesiones activas pagadas de un conductor específico ordenadas por end_time ASC (la que vence primero).
 */
export async function getActiveSessions(userId) {
  const query = `
    SELECT 
      s.id,
      s.receipt_number AS receiptNumber,
      s.plate,
      s.zone,
      s.space_id AS spaceId,
      s.start_time AS startTime,
      s.end_time AS endTime
    FROM parking_sessions s
    WHERE s.user_id = :userId
      AND s.status = 'active'
      AND s.payment_status = 'paid'
      AND s.end_time > NOW()
    ORDER BY s.end_time ASC
  `;

  const rows = await db.query(query, {
    replacements: { userId },
    type: QueryTypes.SELECT
  });

  return rows.map(r => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    plate: r.plate,
    zone: r.zone,
    spaceId: r.spaceId,
    startTime: r.startTime,
    endTime: r.endTime
  }));
}

/**
 * Obtiene los vehículos registrados del conductor (HU-004).
 */
export async function getUserVehicles(userId) {
  const rows = await db.query(
    `SELECT id, plate, brand_model AS brandModel
     FROM vehicles
     WHERE user_id = :userId
     ORDER BY plate ASC`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  return rows.map(r => ({
    id: r.id,
    plate: r.plate,
    brandModel: r.brandModel || ''
  }));
}
