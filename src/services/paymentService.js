import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import {
  validateParkingPayment,
  validateExtensionPayment,
  calculateAmount,
  calculateEndTime,
  buildReceiptNumber
} from '../utils/paymentRules.js';
import { SQL_OCCUPIED_EXISTS } from './driverParkingService.js';
import { formatSchedule } from '../utils/zoneRules.js';
import { guessVehicleType, normalizeVehicleType, isTypeAllowedInZone, zoneClassError } from '../utils/vehicleTypes.js';
import { getRateFor } from './vehicleRateService.js';

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

  const { plate, zone, spaceId, rateType, quantity, vehicleType, saveVehicle, preferentialConfirmed } = data;

  return await db.transaction(async (transaction) => {
    // 1. Obtener zona y tarifas desde la BD
    const zones = await db.query(
      `SELECT code, rate_per_hour, rate_per_day, opens_at, closes_at, vehicle_class,
              (CURTIME() >= opens_at AND CURTIME() < closes_at) AS is_open
         FROM zones WHERE code = ? LIMIT 1`,
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

    // HU-019 (#35): solo se puede parquear dentro del horario de servicio de la zona
    if (zoneRecord.is_open !== undefined && !Number(zoneRecord.is_open)) {
      throw new PaymentError(
        `Zone ${zoneRecord.code} is closed right now. Service hours: ${formatSchedule(zoneRecord.opens_at, zoneRecord.closes_at)}.`,
        409
      );
    }

    // 1b. Tipo del vehículo: el registrado manda; si es una placa nueva, el que eligió el conductor;
    //     si no hay ninguno, se deduce de la placa (letra al final = moto).
    const [ownVehicle] = await db.query(
      'SELECT id, vehicle_type FROM vehicles WHERE plate = ? AND user_id = ? LIMIT 1',
      { replacements: [plate, userId], type: QueryTypes.SELECT, transaction }
    );
    const chargedType = normalizeVehicleType(ownVehicle && ownVehicle.vehicle_type)
      || vehicleType
      || guessVehicleType(plate);

    // 1c. Zonas solo para motos o solo para bicicletas (migración 007)
    if (!isTypeAllowedInZone(chargedType, zoneRecord.vehicle_class)) {
      throw new PaymentError(zoneClassError(zoneRecord.code, zoneRecord.vehicle_class), 409);
    }

    // 2. Espacio: si viene spaceId se verifica que exista y esté libre;
    //    si no viene, se asigna el primer espacio libre de la zona (HU-004).
    let assignedSpaceId = spaceId;

    if (spaceId) {
      const spaces = await db.query(
        `SELECT ps.id, ps.space_type, ${SQL_OCCUPIED_EXISTS} AS occupied
         FROM parking_spaces ps
         WHERE ps.id = ? AND ps.zone = ?
         LIMIT 1 FOR UPDATE`,
        {
          replacements: [spaceId, zone],
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (!spaces || spaces.length === 0) {
        throw new PaymentError('Please select a valid zone.', 400);
      }

      if (Number(spaces[0].occupied) === 1) {
        throw new PaymentError('This space is no longer available.', 409);
      }

      // Espacios preferenciales: el conductor debe confirmar que lo necesita
      if (spaces[0].space_type === 'preferential' && !preferentialConfirmed) {
        throw new PaymentError(
          'This space is reserved for people with disabilities, pregnant women or people who need special attention. Please confirm to use it.',
          409
        );
      }
    } else {
      const freeSpaces = await db.query(
        `SELECT ps.id
         FROM parking_spaces ps
         WHERE ps.zone = ? AND ps.space_type = 'regular' AND NOT ${SQL_OCCUPIED_EXISTS}
         ORDER BY CHAR_LENGTH(ps.id), ps.id
         LIMIT 1 FOR UPDATE`,
        {
          replacements: [zone],
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (!freeSpaces || freeSpaces.length === 0) {
        // La asignación automática nunca toma un espacio preferencial
        throw new PaymentError('There are no free regular spaces in this zone.', 409);
      }

      assignedSpaceId = freeSpaces[0].id;
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

    // 4. Id del vehículo si pertenece al mismo usuario (consultado en 1b)
    let vehicleId = ownVehicle ? ownVehicle.id : null;
    let vehicleSaved = false;

    // 4b. HU-004: si el conductor marcó "Save this vehicle", la placa nueva queda en sus vehículos.
    //     Si la placa ya es de otra cuenta no se toca (el parqueo se paga igual).
    if (!vehicleId && saveVehicle) {
      const taken = await db.query('SELECT id FROM vehicles WHERE plate = ? LIMIT 1 FOR UPDATE', {
        replacements: [plate],
        type: QueryTypes.SELECT,
        transaction
      });
      if (!taken || taken.length === 0) {
        const [newVehicleId] = await db.query(
          'INSERT INTO vehicles (user_id, plate, vehicle_type) VALUES (?, ?, ?)',
          { replacements: [userId, plate, chargedType], type: QueryTypes.INSERT, transaction }
        );
        vehicleId = newVehicleId;
        vehicleSaved = true;
      }
    }

    // 5. Calcular el monto en el servidor con la tarifa del tipo de vehículo (migración 007)
    const typeRate = await getRateFor(chargedType, { transaction });
    const amount = calculateAmount(rateType, quantity, typeRate);

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
            (receipt_number, user_id, vehicle_id, plate, vehicle_type, zone, space_id, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'paid', NOW())`,
          {
            replacements: [
              receiptNumber,
              userId,
              vehicleId,
              plate,
              chargedType,
              zone,
              assignedSpaceId,
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
          endTime,
          zone,
          spaceId: assignedSpaceId,
          vehicleType: chargedType,
          vehicleSaved
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
      `SELECT ps.id, ps.user_id, ps.receipt_number, ps.plate, ps.vehicle_type, ps.end_time, ps.status, ps.payment_status, z.allows_extension
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
    // La extensión cuesta lo mismo por hora que el parqueo: tarifa del tipo de vehículo de la sesión
    const { ratePerHour } = await getRateFor(session.vehicle_type || guessVehicleType(session.plate), { transaction });
    const amount = hours * ratePerHour;
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