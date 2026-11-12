import db from '../config/db.js';
import { QueryTypes } from 'sequelize';

/**
 * Obtiene los reportes y estadísticas del Dashboard según el rango especificado.
 * @param {string} range - 'today' | '7d' | '30d'
 */
export async function getDashboard(range = 'today') {
  let dateFilter = 'DATE(ps.start_time) = CURDATE()';
  let extFilter = 'DATE(se.created_at) = CURDATE()';
  let fineFilter = 'DATE(f.issued_at) = CURDATE()';

  if (range === '7d') {
    dateFilter = 'ps.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    extFilter = 'se.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    fineFilter = 'f.issued_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  } else if (range === '30d') {
    dateFilter = 'ps.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    extFilter = 'se.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    fineFilter = 'f.issued_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  }

  // 1. Ingresos totales (Parqueos + Extensiones)
  const [sessionRev] = await db.query(`
    SELECT COALESCE(SUM(ps.amount), 0) AS total
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ${dateFilter}
  `, { type: QueryTypes.SELECT });

  const [extRev] = await db.query(`
    SELECT COALESCE(SUM(se.amount), 0) AS total
    FROM session_extensions se
    JOIN parking_sessions ps ON se.session_id = ps.id
    WHERE ps.payment_status = 'paid' AND ${extFilter}
  `, { type: QueryTypes.SELECT });

  const revenue = Number(sessionRev.total) + Number(extRev.total);

  // 2. Total de Sesiones Pagadas
  const [sessionsRes] = await db.query(`
    SELECT COUNT(*) AS total
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ${dateFilter}
  `, { type: QueryTypes.SELECT });

  const sessions = Number(sessionsRes.total);

  // 3. Duración Promedio (en minutos)
  const [avgDurRes] = await db.query(`
    SELECT COALESCE(AVG(TIMESTAMPDIFF(MINUTE, ps.start_time, ps.end_time)), 0) AS avgMinutes
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ${dateFilter}
  `, { type: QueryTypes.SELECT });

  const avgDurationMinutes = Math.round(Number(avgDurRes.avgMinutes));

  // 4. Multas Emitidas
  const [finesRes] = await db.query(`
    SELECT COUNT(*) AS total
    FROM fines f
    WHERE ${fineFilter}
  `, { type: QueryTypes.SELECT });

  const finesIssued = Number(finesRes.total);

  // 5. Ocupación por Hora (Horas 7 a 18 de HOY)
  const [totalSpacesRes] = await db.query(`
    SELECT COUNT(*) AS total FROM parking_spaces
  `, { type: QueryTypes.SELECT });

  const totalSpaces = Number(totalSpacesRes.total) || 1;
  const occupancyByHour = [];
  let peakHour = 7;
  let maxOccupancyPercent = 0;

  for (let hour = 7; hour <= 18; hour++) {
    const hourStartStr = `${hour < 10 ? '0' + hour : hour}:00:00`;
    const hourEndStr = `${hour < 10 ? '0' + hour : hour}:59:59`;

    const [occRes] = await db.query(`
      SELECT COUNT(DISTINCT space_id) AS occupiedCount
      FROM parking_sessions
      WHERE payment_status = 'paid'
        AND DATE(start_time) = CURDATE()
        AND TIME(start_time) <= :hourEndStr
        AND TIME(end_time) >= :hourStartStr
    `, {
      replacements: { hourStartStr, hourEndStr },
      type: QueryTypes.SELECT
    });

    const count = Number(occRes ? occRes.occupiedCount : 0);
    const percent = Math.min(100, Math.round((count / totalSpaces) * 100));

    if (percent > maxOccupancyPercent) {
      maxOccupancyPercent = percent;
      peakHour = hour;
    }

    occupancyByHour.push({
      hour: `${hour}h`,
      percent
    });
  }

  // 6. Ingresos por Zona
  const revenueByZoneRows = await db.query(`
    SELECT z.code AS zone, COALESCE(SUM(ps.amount), 0) AS amount
    FROM zones z
    LEFT JOIN parking_sessions ps ON ps.zone = z.code AND ps.payment_status = 'paid' AND ${dateFilter}
    GROUP BY z.code
    ORDER BY z.code ASC
  `, { type: QueryTypes.SELECT });

  const maxZoneRev = Math.max(...revenueByZoneRows.map(r => Number(r.amount)), 1);
  const revenueByZone = revenueByZoneRows.map(r => {
    const amt = Number(r.amount);
    return {
      zone: r.zone,
      amount: amt,
      percent: Math.round((amt / maxZoneRev) * 100)
    };
  });

  // 7. Últimas 7 Sesiones
  const latestSessionsRows = await db.query(`
    SELECT 
      ps.plate,
      ps.space_id AS spaceId,
      TIMESTAMPDIFF(MINUTE, ps.start_time, ps.end_time) AS durationMinutes,
      ps.amount
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ${dateFilter}
    ORDER BY ps.start_time DESC
    LIMIT 7
  `, { type: QueryTypes.SELECT });

  const latestSessions = latestSessionsRows.map(r => {
    const mins = Number(r.durationMinutes);
    let durationText = `${mins} min`;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationText = m > 0 ? `${h}h ${m}m` : `${h} h`;
    }
    return {
      plate: r.plate,
      spaceId: r.spaceId,
      durationText,
      amount: Number(r.amount)
    };
  });

  return {
    revenue,
    sessions,
    avgDurationMinutes,
    finesIssued,
    occupancyByHour,
    peakHourText: `${peakHour}:00 · ${maxOccupancyPercent}%`,
    revenueByZone,
    latestSessions
  };
}

/**
 * Obtiene todas las sesiones pagadas del rango para la exportación CSV.
 */
export async function getExportSessions(range = 'today') {
  let dateFilter = 'DATE(ps.start_time) = CURDATE()';

  if (range === '7d') {
    dateFilter = 'ps.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
  } else if (range === '30d') {
    dateFilter = 'ps.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  }

  const rows = await db.query(`
    SELECT 
      ps.plate,
      ps.space_id AS spaceId,
      ps.zone,
      ps.start_time AS startTime,
      ps.end_time AS endTime,
      ps.amount
    FROM parking_sessions ps
    WHERE ps.payment_status = 'paid' AND ${dateFilter}
    ORDER BY ps.start_time DESC
  `, { type: QueryTypes.SELECT });

  return rows;
}