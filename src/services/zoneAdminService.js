// HU-018 (#35) · Lectura y actualización de tarifas, horario y regla de extensión por zona
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { toHHMM, formatSchedule } from '../utils/zoneRules.js';

// Lista las zonas con sus tarifas, horario, si está abierta ahora y cuántas sesiones activas tiene
export async function listZoneSettings() {
  const rows = await db.query(
    `SELECT z.code, z.name, z.description,
            z.rate_per_hour AS ratePerHour, z.rate_per_day AS ratePerDay,
            z.allows_extension AS allowsExtension,
            z.opens_at AS opensAt, z.closes_at AS closesAt,
            (CURTIME() >= z.opens_at AND CURTIME() < z.closes_at) AS isOpen,
            (SELECT COUNT(*) FROM parking_spaces ps WHERE ps.zone = z.code) AS spaces,
            (SELECT COUNT(*) FROM parking_sessions s
              WHERE s.zone = z.code AND s.status = 'active'
                AND s.payment_status = 'paid' AND s.end_time > NOW()) AS activeSessions
       FROM zones z
      ORDER BY z.code ASC`,
    { type: QueryTypes.SELECT }
  );

  return rows.map(r => ({
    code: r.code,
    name: r.name,
    description: r.description,
    ratePerHour: Number(r.ratePerHour),
    ratePerDay: Number(r.ratePerDay),
    allowsExtension: Boolean(r.allowsExtension),
    opensAt: toHHMM(r.opensAt),
    closesAt: toHHMM(r.closesAt),
    scheduleText: formatSchedule(r.opensAt, r.closesAt),
    isOpen: Boolean(Number(r.isOpen)),
    spaces: Number(r.spaces),
    activeSessions: Number(r.activeSessions)
  }));
}

// Actualiza una zona. Las sesiones activas conservan lo que ya pagaron (el monto está en cada sesión).
// Devuelve la zona actualizada o null si no existe.
export async function updateZoneSettings(code, value) {
  await db.query(
    `UPDATE zones
        SET rate_per_hour = :ratePerHour, rate_per_day = :ratePerDay,
            allows_extension = :allowsExtension,
            opens_at = :opensAt, closes_at = :closesAt
      WHERE code = :code`,
    { replacements: { ...value, code } }
  );

  const zones = await listZoneSettings();
  return zones.find(z => z.code === code) || null;
}
