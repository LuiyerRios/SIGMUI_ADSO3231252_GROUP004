// HU-006 / HU-007 · Consultas del agente: estado de una placa y registro de multas
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { classifyPlate, formatDuration, formatTime, formatDate, generateFineNumber, FINE_AMOUNT } from '../utils/agentRules.js';

// Última sesión pagada de la placa (la de fin más reciente)
const LAST_SESSION_SQL = `
  SELECT ps.id, ps.plate, ps.zone, ps.space_id, ps.start_time, ps.end_time, ps.status, ps.receipt_number,
         f.fine_number, f.issued_at
    FROM parking_sessions ps
    LEFT JOIN fines f ON f.session_id = ps.id
   WHERE ps.plate = :plate AND ps.payment_status = 'paid'
   ORDER BY ps.end_time DESC
   LIMIT 1`;

// Resumen para la vista: estado, zona/espacio, horas en hora de Colombia y si ya tiene multa
export async function getPlateStatus(plate, now = new Date()) {
  const [session] = await db.query(LAST_SESSION_SQL, { replacements: { plate }, type: QueryTypes.SELECT });
  const status = classifyPlate(session, now);
  if (status === 'not_registered') return { plate, status };

  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  return {
    plate,
    status,
    sessionId: session.id,
    zone: session.zone,
    space: session.space_id || session.zone,
    receiptNumber: session.receipt_number,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    date: formatDate(start),
    range: `${formatTime(start)} - ${formatTime(end)} (${formatDuration(end - start)})`,
    remaining: status === 'active' ? formatDuration(end - now) : null,
    expiredAgo: status === 'expired' ? formatDuration(now - end) : null,
    expiredAt: formatTime(end),
    fine: session.fine_number
      ? { number: session.fine_number, issuedAt: `${formatDate(session.issued_at)} ${formatTime(session.issued_at)}` }
      : null
  };
}

// Registra la multa en una transacción: vuelve a validar el estado y bloquea la sesión para evitar dos multas a la vez
export async function issueFine({ plate, location, comments, agentId }) {
  return db.transaction(async (transaction) => {
    const [session] = await db.query(`${LAST_SESSION_SQL} FOR UPDATE`, {
      replacements: { plate }, type: QueryTypes.SELECT, transaction
    });
    const status = classifyPlate(session);
    if (status === 'not_registered') return { error: 'This plate has no parking payments. A fine cannot be issued.', code: 409 };
    if (status === 'active') return { error: 'The parking session is active now. A fine cannot be issued.', code: 409 };
    if (session.fine_number) return { error: `This session already has the fine ${session.fine_number}.`, code: 409 };

    // Número único: si coincide con uno existente se genera otro (máximo 3 intentos)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const fineNumber = generateFineNumber();
      try {
        await db.query(
          `INSERT INTO fines (fine_number, session_id, plate, agent_id, location, comments, amount)
           VALUES (:fineNumber, :sessionId, :plate, :agentId, :location, :comments, :amount)`,
          {
            replacements: { fineNumber, sessionId: session.id, plate, agentId, location, comments, amount: FINE_AMOUNT },
            transaction
          }
        );
        return { fineNumber, amount: FINE_AMOUNT, issuedAt: new Date().toISOString() };
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      }
    }
    return { error: 'The fine number could not be generated. The fine was not saved; please try again.', code: 500 };
  });
}
