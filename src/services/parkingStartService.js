import db from '../config/db.js';
import { QueryTypes } from 'sequelize';

/**
 * Consulta la regla de ocupación en SQL para saber si un espacio específico está libre.
 */
const SQL_OCCUPIED_EXISTS = `
  (ps.status = 'occupied' OR EXISTS (
    SELECT 1 FROM parking_sessions s 
    WHERE s.space_id = ps.id 
      AND s.status = 'active' 
      AND s.payment_status = 'paid' 
      AND s.end_time > NOW()
  ))
`;

/**
 * Obtiene la información de una zona por su código.
 */
export async function getZoneByCode(zoneCode) {
  const query = `
    SELECT 
      code, 
      name, 
      rate_per_hour AS ratePerHour, 
      rate_per_day AS ratePerDay, 
      allows_extension AS allowsExtension
    FROM zones
    WHERE code = :zoneCode
  `;

  const [zone] = await db.query(query, {
    replacements: { zoneCode },
    type: QueryTypes.SELECT
  });

  if (!zone) return null;

  return {
    code: zone.code,
    name: zone.name,
    ratePerHour: Number(zone.ratePerHour),
    ratePerDay: Number(zone.ratePerDay),
    allowsExtension: Boolean(zone.allowsExtension)
  };
}

/**
 * Obtiene únicamente los espacios disponibles de una zona.
 */
export async function getAvailableSpacesByZone(zoneCode) {
  const query = `
    SELECT 
      ps.id,
      ps.zone
    FROM parking_spaces ps
    WHERE ps.zone = :zoneCode
      AND NOT ${SQL_OCCUPIED_EXISTS}
    ORDER BY CHAR_LENGTH(ps.id), ps.id ASC
  `;

  const rows = await db.query(query, {
    replacements: { zoneCode },
    type: QueryTypes.SELECT
  });

  return rows.map(r => ({
    id: r.id,
    zone: r.zone
  }));
}