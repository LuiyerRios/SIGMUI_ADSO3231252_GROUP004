// HU-013 · Pagos del conductor en sesión: parqueos y extensiones pagadas (misma regla que el historial del admin, HU-017)
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';

// Últimos pagos del conductor (parqueos + extensiones), del más reciente al más antiguo
export async function getDriverPayments(userId, limit = 50) {
  return db.query(
    `SELECT p.*
       FROM (
         SELECT ps.id AS session_id, ps.start_time AS paid_at, ps.receipt_number,
                ps.plate, ps.zone, ps.space_id, 'parking' AS type, ps.amount
           FROM parking_sessions ps
          WHERE ps.user_id = :userId AND ps.payment_status = 'paid'
         UNION ALL
         SELECT ps.id AS session_id, se.created_at AS paid_at, CONCAT(ps.receipt_number, '-E', se.id) AS receipt_number,
                ps.plate, ps.zone, ps.space_id, 'extension' AS type, se.amount
           FROM session_extensions se
           JOIN parking_sessions ps ON ps.id = se.session_id
          WHERE ps.user_id = :userId AND ps.payment_status = 'paid'
       ) p
      ORDER BY p.paid_at DESC
      LIMIT :limit`,
    { replacements: { userId, limit }, type: QueryTypes.SELECT }
  );
}

// Totales de las tarjetas: gastado este mes, número de pagos y sesiones activas ahora
export async function getDriverPaymentStats(userId) {
  const [row] = await db.query(
    `SELECT
       (SELECT COALESCE(SUM(ps.amount), 0) FROM parking_sessions ps
         WHERE ps.user_id = :userId AND ps.payment_status = 'paid'
           AND ps.start_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01'))
       + (SELECT COALESCE(SUM(se.amount), 0) FROM session_extensions se
           JOIN parking_sessions ps ON ps.id = se.session_id
          WHERE ps.user_id = :userId AND ps.payment_status = 'paid'
            AND se.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS month_total,
       (SELECT COUNT(*) FROM parking_sessions ps
         WHERE ps.user_id = :userId AND ps.payment_status = 'paid') AS parking_count,
       (SELECT COUNT(*) FROM session_extensions se
          JOIN parking_sessions ps ON ps.id = se.session_id
         WHERE ps.user_id = :userId AND ps.payment_status = 'paid') AS extension_count,
       (SELECT COUNT(*) FROM parking_sessions ps
         WHERE ps.user_id = :userId AND ps.payment_status = 'paid'
           AND ps.status = 'active' AND ps.end_time > NOW()) AS active_count`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return {
    monthTotal: Number(row.month_total) || 0,
    parkingCount: Number(row.parking_count) || 0,
    extensionCount: Number(row.extension_count) || 0,
    activeCount: Number(row.active_count) || 0
  };
}

// Recibo de un parqueo pagado del conductor (null si no es suyo o no existe), con la suma de sus extensiones
export async function getDriverReceipt(userId, sessionId) {
  const [session] = await db.query(
    `SELECT ps.id, ps.receipt_number, ps.plate, ps.zone, ps.space_id, ps.rate_type, ps.quantity,
            ps.amount, ps.start_time, ps.end_time, ps.status,
            z.rate_per_hour, z.rate_per_day, v.brand_model,
            (SELECT COALESCE(SUM(se.amount), 0) FROM session_extensions se WHERE se.session_id = ps.id) AS extensions_amount,
            (SELECT COALESCE(SUM(se.hours), 0) FROM session_extensions se WHERE se.session_id = ps.id) AS extensions_hours
       FROM parking_sessions ps
       LEFT JOIN zones z ON z.code = ps.zone
       LEFT JOIN vehicles v ON v.plate = ps.plate AND v.user_id = ps.user_id
      WHERE ps.id = :sessionId AND ps.user_id = :userId AND ps.payment_status = 'paid'
      LIMIT 1`,
    { replacements: { sessionId, userId }, type: QueryTypes.SELECT }
  );
  return session || null;
}
