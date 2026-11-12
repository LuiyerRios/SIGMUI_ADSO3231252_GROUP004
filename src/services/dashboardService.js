import db from '../config/db.js';
import { QueryTypes } from 'sequelize';

// Rangos permitidos: hoy, últimos 7 días y últimos 30 días (contando hoy, desde el inicio del día)
export const VALID_RANGES = ['today', '7d', '30d'];
const RANGE_DAYS = { today: 0, '7d': 6, '30d': 29 };

export function normalizeRange(range) {
  return VALID_RANGES.includes(range) ? range : 'today';
}

/**
 * Reportes y estadísticas del Dashboard (HU-008).
 * @param {string} range - 'today' | '7d' | '30d'
 */
export async function getDashboard(range = 'today') {
  const days = RANGE_DAYS[normalizeRange(range)];
  const replacements = { days };
  const from = 'DATE_SUB(CURDATE(), INTERVAL :days DAY)';

  // 1. Ingresos (parqueos pagados + extensiones de sesiones pagadas, igual que HU-017)
  const [rev] = await db.query(`
    SELECT
      (SELECT COALESCE(SUM(ps.amount), 0) FROM parking_sessions ps
        WHERE ps.payment_status = 'paid' AND ps.start_time >= ${from}) +
      (SELECT COALESCE(SUM(se.amount), 0) FROM session_extensions se
        JOIN parking_sessions ps ON ps.id = se.session_id
        WHERE ps.payment_status = 'paid' AND se.created_at >= ${from}) AS total
  `, { replacements, type: QueryTypes.SELECT });

  // 2 y 3. Sesiones pagadas y duración promedio (minutos)
  const [ses] = await db.query(`
    SELECT COUNT(*) AS total,
           COALESCE(AVG(TIMESTAMPDIFF(MINUTE, ps.start_time, ps.end_time)), 0) AS avgMinutes
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ps.start_time >= ${from}
  `, { replacements, type: QueryTypes.SELECT });

  // 4. Multas emitidas
  const [fin] = await db.query(`
    SELECT COUNT(*) AS total FROM fines f WHERE f.issued_at >= ${from}
  `, { replacements, type: QueryTypes.SELECT });

  // 5. Ocupación por hora de HOY (7:00 a 18:00): espacios con una sesión pagada que se cruza con esa hora
  const [spaces] = await db.query('SELECT COUNT(*) AS total FROM parking_spaces', { type: QueryTypes.SELECT });
  const totalSpaces = Number(spaces.total) || 0;

  const hourRows = await db.query(`
    SELECT h.hour, COUNT(DISTINCT s.space_id) AS occupied
    FROM (
      SELECT 7 AS hour UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18
    ) h
    LEFT JOIN parking_sessions s
      ON s.payment_status = 'paid'
     AND s.space_id IS NOT NULL
     AND s.start_time < DATE_ADD(CURDATE(), INTERVAL h.hour + 1 HOUR)
     AND s.end_time   > DATE_ADD(CURDATE(), INTERVAL h.hour HOUR)
    GROUP BY h.hour
    ORDER BY h.hour
  `, { type: QueryTypes.SELECT });

  let peakHour = null;
  let peakPercent = 0;
  const occupancyByHour = hourRows.map(r => {
    const percent = totalSpaces ? Math.min(100, Math.round((Number(r.occupied) / totalSpaces) * 100)) : 0;
    if (percent > peakPercent) {
      peakPercent = percent;
      peakHour = Number(r.hour);
    }
    return { hour: Number(r.hour), label: `${r.hour}h`, percent };
  });

  // 6. Ingresos por zona (parqueos + extensiones), con % respecto a la zona de mayor ingreso
  const zoneRows = await db.query(`
    SELECT z.code AS zone,
      (SELECT COALESCE(SUM(ps.amount), 0) FROM parking_sessions ps
        WHERE ps.zone = z.code AND ps.payment_status = 'paid' AND ps.start_time >= ${from}) +
      (SELECT COALESCE(SUM(se.amount), 0) FROM session_extensions se
        JOIN parking_sessions ps ON ps.id = se.session_id
        WHERE ps.zone = z.code AND ps.payment_status = 'paid' AND se.created_at >= ${from}) AS amount
    FROM zones z
    ORDER BY z.code
  `, { replacements, type: QueryTypes.SELECT });

  const maxZone = Math.max(1, ...zoneRows.map(r => Number(r.amount)));
  const revenueByZone = zoneRows.map(r => ({
    zone: r.zone,
    amount: Number(r.amount),
    percent: Math.round((Number(r.amount) / maxZone) * 100)
  }));

  // 7. Últimas 7 sesiones pagadas del rango
  const latestRows = await db.query(`
    SELECT ps.plate, ps.space_id AS spaceId, ps.zone, ps.rate_type AS rateType, ps.quantity, ps.amount
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ps.start_time >= ${from}
    ORDER BY ps.start_time DESC
    LIMIT 7
  `, { replacements, type: QueryTypes.SELECT });

  const latestSessions = latestRows.map(r => ({
    plate: r.plate,
    spaceId: r.spaceId || r.zone,
    durationText: r.rateType === 'day' ? `${r.quantity} day` : `${r.quantity} h`,
    amount: Number(r.amount)
  }));

  return {
    revenue: Number(rev.total),
    sessions: Number(ses.total),
    avgDurationMinutes: Math.round(Number(ses.avgMinutes)),
    finesIssued: Number(fin.total),
    occupancyByHour,
    peakHour,
    peakHourText: peakHour === null ? 'No activity yet' : `${peakHour}:00 · ${peakPercent}%`,
    revenueByZone,
    latestSessions
  };
}

/**
 * Todas las sesiones pagadas del rango para el CSV.
 */
export async function getExportSessions(range = 'today') {
  const days = RANGE_DAYS[normalizeRange(range)];
  return db.query(`
    SELECT ps.plate, ps.space_id AS spaceId, ps.zone, ps.start_time AS startTime, ps.end_time AS endTime, ps.amount
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ps.start_time >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
    ORDER BY ps.start_time DESC
  `, { replacements: { days }, type: QueryTypes.SELECT });
}