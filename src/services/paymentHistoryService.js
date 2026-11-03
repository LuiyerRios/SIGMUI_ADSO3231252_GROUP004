import { QueryTypes } from 'sequelize';
import db from '../config/db.js';

function buildBaseQuery(filters) {
  const { from, to, zone, plate } = filters;
  const replacements = [from, `${to} 23:59:59` ];
  const whereClauses = ['p.payment_date >= ?', 'p.payment_date <= ?'];

  if (zone !== 'all') {
    whereClauses.push('p.zone = ?');
    replacements.push(zone);
  }

  if (plate) {
    whereClauses.push('p.plate LIKE ?');
    replacements.push(`%${plate}%`);
  }

  const whereSql = whereClauses.join(' AND ');

  const sql = `
    SELECT 
      p.id,
      p.payment_date,
      p.receipt_number,
      p.plate,
      p.driver_name,
      p.zone,
      p.type,
      p.amount
    FROM (
      SELECT 
        ps.id AS id,
        ps.start_time AS payment_date,
        ps.receipt_number AS receipt_number,
        ps.plate AS plate,
        COALESCE(u.full_name, 'Driver') AS driver_name,
        ps.zone AS zone,
        'parking' AS type,
        ps.amount AS amount
      FROM parking_sessions ps
      LEFT JOIN users u ON ps.user_id = u.id
      WHERE ps.payment_status = 'paid'

      UNION ALL

      SELECT 
        se.id AS id,
        se.created_at AS payment_date,
        CONCAT(ps.receipt_number, '-E', se.id) AS receipt_number,
        ps.plate AS plate,
        COALESCE(u.full_name, 'Driver') AS driver_name,
        ps.zone AS zone,
        'extension' AS type,
        se.amount AS amount
      FROM session_extensions se
      JOIN parking_sessions ps ON se.session_id = ps.id
      LEFT JOIN users u ON ps.user_id = u.id
      WHERE ps.payment_status = 'paid'
    ) p
    WHERE ${whereSql}
  `;

  return { sql, replacements };
}

export async function getPayments(filters, { page = 1, pageSize = 25 } = {}) {
  const { sql: baseSql, replacements } = buildBaseQuery(filters);

  // 1. Obtener totales para el resumen
  const summarySql = `
    SELECT /*+ MAX_EXECUTION_TIME(8000) */
      COALESCE(SUM(p.amount), 0) AS total_revenue,
      COUNT(p.id) AS total_count,
      COALESCE(SUM(CASE WHEN p.type = 'parking' THEN 1 ELSE 0 END), 0) AS parking_count,
      COALESCE(SUM(CASE WHEN p.type = 'extension' THEN 1 ELSE 0 END), 0) AS extension_count
    FROM (${baseSql}) p
  `;

  const [summaryResult] = await db.query(summarySql, {
    replacements,
    type: QueryTypes.SELECT
  });

  const total = Number(summaryResult.total_count) || 0;
  const revenue = Number(summaryResult.total_revenue) || 0;
  const parkingCount = Number(summaryResult.parking_count) || 0;
  const extensionCount = Number(summaryResult.extension_count) || 0;
  const averageTicket = total > 0 ? Math.round(revenue / total) : 0;

  // 2. Obtener filas paginadas
  const offset = (page - 1) * pageSize;
  const pageSql = `
    SELECT /*+ MAX_EXECUTION_TIME(8000) */ p.*
    FROM (${baseSql}) p
    ORDER BY p.payment_date DESC, p.type ASC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await db.query(pageSql, {
    replacements: [...replacements, pageSize, offset],
    type: QueryTypes.SELECT
  });

  return {
    rows,
    total,
    summary: {
      revenue,
      count: total,
      parkingCount,
      extensionCount,
      averageTicket
    }
  };
}

export async function getPaymentsForExport(filters) {
  const { sql: baseSql, replacements } = buildBaseQuery(filters);

  const exportSql = `
    SELECT /*+ MAX_EXECUTION_TIME(8000) */ p.*
    FROM (${baseSql}) p
    ORDER BY p.payment_date DESC, p.type ASC, p.id DESC
    LIMIT 5000
  `;

  const rows = await db.query(exportSql, {
    replacements,
    type: QueryTypes.SELECT
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.revenue += Number(row.amount);
      acc.count += 1;
      if (row.type === 'parking') acc.parkingCount += 1;
      if (row.type === 'extension') acc.extensionCount += 1;
      return acc;
    },
    { revenue: 0, count: 0, parkingCount: 0, extensionCount: 0, averageTicket: 0 }
  );

  summary.averageTicket = summary.count > 0 ? Math.round(summary.revenue / summary.count) : 0;

  return { rows, summary };
}