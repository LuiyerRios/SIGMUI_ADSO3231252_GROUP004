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
 * Obtiene las sesiones activas pagadas de un conductor, ordenadas por end_time ASC (la que vence primero).
 * Incluye la tarifa por hora y si la zona permite extensiones (HU-005).
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
      s.end_time AS endTime,
      z.rate_per_hour AS ratePerHour,
      z.allows_extension AS allowsExtension
    FROM parking_sessions s
    JOIN zones z ON z.code = s.zone
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
    endTime: r.endTime,
    ratePerHour: Number(r.ratePerHour),
    allowsExtension: Boolean(r.allowsExtension)
  }));
}

/**
 * Pagos de HOY del conductor (parqueos y extensiones) para el historial de HU-005.
 * Devuelve { items: [{ type, spaceId, zone, plate, time, hours, rateType, amount }], totalToday }.
 */
export async function getTodayActivity(userId) {
  const query = `
    SELECT 'parking' AS type, s.space_id AS spaceId, s.zone, s.plate,
           s.start_time AS time, s.rate_type AS rateType, s.quantity, s.amount
    FROM parking_sessions s
    WHERE s.user_id = :userId AND s.payment_status = 'paid' AND DATE(s.start_time) = CURDATE()
    UNION ALL
    SELECT 'extension' AS type, s.space_id AS spaceId, s.zone, s.plate,
           e.created_at AS time, 'hour' AS rateType, e.hours AS quantity, e.amount
    FROM session_extensions e
    JOIN parking_sessions s ON s.id = e.session_id
    WHERE s.user_id = :userId AND s.payment_status = 'paid' AND DATE(e.created_at) = CURDATE()
    ORDER BY time ASC
  `;

  const rows = await db.query(query, {
    replacements: { userId },
    type: QueryTypes.SELECT
  });

  const items = rows.map(r => ({
    type: r.type,
    spaceId: r.spaceId,
    zone: r.zone,
    plate: r.plate,
    time: r.time,
    rateType: r.rateType,
    quantity: Number(r.quantity),
    amount: Number(r.amount)
  }));

  const totalToday = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, totalToday };
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
