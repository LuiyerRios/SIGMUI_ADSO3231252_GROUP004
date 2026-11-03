import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import {
  validateParkingPayment,
  validateExtensionPayment,
  calculateAmount,
  calculateEndTime,
  buildReceiptNumber
} from '../utils/paymentRules.js';

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
  }
}

export async function recordParkingPayment(userId, input) {
  const { data, error } = validateParkingPayment(input);
  if (error) {
    throw new PaymentError(error.message, error.status);
  }

  const { plate, zone, spaceId, rateType, quantity } = data;

  return await db.transaction(async (transaction) => {
    // 1. Obtener zona y tarifas desde la BD
    const zones = await db.query(
      'SELECT code, rate_per_hour, rate_per_day FROM zones WHERE code = ? LIMIT 1',
      {
        replacements: [zone],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!zones || zones.length === 0) {
      throw new PaymentError('Please select a valid zone.', 400);
    }

    const zoneRecord = zones[0];

    // 2. Si viene spaceId, verificar que exista en la BD para esa zona
    if (spaceId) {
      const spaces = await db.query(
        'SELECT id FROM parking_spaces WHERE id = ? AND zone = ? LIMIT 1',
        {
          replacements: [spaceId, zone],
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (!spaces || spaces.length === 0) {
        throw new PaymentError('Please select a valid zone.', 400);
      }
    }

    // 3. Verificar que no exista sesión activa PAGADA previa para la misma placa
    const activeSessions = await db.query(
      `SELECT id FROM parking_sessions 
       WHERE plate = ? AND status = 'active' AND payment_status = 'paid' AND end_time > NOW() 
       LIMIT 1`,
      {
        replacements: [plate],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (activeSessions && activeSessions.length > 0) {
      throw new PaymentError('This vehicle already has an active parking session.', 409);
    }

    // 4. Buscar id del vehículo si pertenece al mismo usuario
    const vehicles = await db.query(
      'SELECT id FROM vehicles WHERE plate = ? AND user_id = ? LIMIT 1',
      {
        replacements: [plate, userId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const vehicleId = vehicles && vehicles.length > 0 ? vehicles[0].id : null;

    // 5. Calcular el monto en el servidor
    const amount = calculateAmount(rateType, quantity, {
      ratePerHour: zoneRecord.rate_per_hour,
      ratePerDay: zoneRecord.rate_per_day
    });

    const startTime = new Date();
    const endTime = calculateEndTime(startTime, rateType, quantity);

    // 6. Generar número de recibo único (hasta 3 reintentos)
    let receiptNumber = '';
    let inserted = false;
    let attempts = 0;

    while (!inserted && attempts < 3) {
      attempts++;
      receiptNumber = buildReceiptNumber(startTime);

      try {
        const [insertId] = await db.query(
          `INSERT INTO parking_sessions 
            (receipt_number, user_id, vehicle_id, plate, zone, space_id, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'paid', NOW())`,
          {
            replacements: [
              receiptNumber,
              userId,
              vehicleId,
              plate,
              zone,
              spaceId,
              rateType,
              quantity,
              amount,
              startTime,
              endTime
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        return {
          id: insertId,
          receiptNumber,
          amount,
          startTime,
          endTime
        };
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError' || err.code === 'ER_DUP_ENTRY') {
          if (attempts >= 3) {
            throw new PaymentError('The payment could not be processed. Please try again.', 500);
          }
        } else {
          throw err;
        }
      }
    }
  });
}

export async function recordExtensionPayment(userId, input) {
  const { data, error } = validateExtensionPayment(input);
  if (error) {
    throw new PaymentError(error.message, error.status);
  }

  const { sessionId, hours } = data;

  return await db.transaction(async (transaction) => {
    // 1. Obtener y bloquear la sesión para actualizar (FOR UPDATE)
    const sessions = await db.query(
      `SELECT ps.id, ps.user_id, ps.receipt_number, ps.end_time, ps.status, ps.payment_status, z.rate_per_hour, z.allows_extension
       FROM parking_sessions ps
       JOIN zones z ON ps.zone = z.code
       WHERE ps.id = ? FOR UPDATE`,
      {
        replacements: [sessionId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!sessions || sessions.length === 0) {
      throw new PaymentError('Parking session not found.', 404);
    }

    const session = sessions[0];

    // Verificar que la sesión pertenezca al usuario
    if (Number(session.user_id) !== Number(userId)) {
      throw new PaymentError('Parking session not found.', 404);
    }

    // Verificar estado activo y vigencia
    const now = new Date();
    const previousEndTime = new Date(session.end_time);

    if (
      session.status !== 'active' ||
      session.payment_status !== 'paid' ||
      previousEndTime <= now ||
      !session.allows_extension
    ) {
      throw new PaymentError('This parking session can no longer be extended.', 409);
    }

    // 2. Calcular valores de extensión
    const amount = hours * session.rate_per_hour;
    const newEndTime = calculateEndTime(previousEndTime, 'hour', hours);

    // 3. Insertar la extensión
    const [extensionId] = await db.query(
      `INSERT INTO session_extensions 
        (session_id, hours, amount, previous_end_time, new_end_time, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      {
        replacements: [sessionId, hours, amount, previousEndTime, newEndTime],
        type: QueryTypes.INSERT,
        transaction
      }
    );

    // 4. Actualizar end_time en parking_sessions
    await db.query(
      'UPDATE parking_sessions SET end_time = ? WHERE id = ?',
      {
        replacements: [newEndTime, sessionId],
        type: QueryTypes.UPDATE,
        transaction
      }
    );

    const extensionReceipt = `${session.receipt_number}-E${extensionId}`;

    return {
      extensionId,
      receiptNumber: extensionReceipt,
      amount,
      newEndTime
    };
  });
}