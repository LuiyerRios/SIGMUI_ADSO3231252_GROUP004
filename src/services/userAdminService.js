// HU-016 · Consultas de la gestión de usuarios y vehículos del admin
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';

const ACTIVE_SESSION = `status = 'active' AND payment_status = 'paid' AND end_time > NOW()`;

// Usuarios con sus vehículos (para la tabla y el panel de edición)
export async function listUsersWithVehicles() {
  const [users, vehicles] = await Promise.all([
    db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.email_verified_at, u.created_at,
              EXISTS (SELECT 1 FROM parking_sessions s WHERE s.user_id = u.id AND s.${ACTIVE_SESSION}) AS has_active_session
         FROM users u
        ORDER BY u.created_at DESC, u.id DESC`,
      { type: QueryTypes.SELECT }
    ),
    db.query(
      `SELECT v.id, v.user_id, v.plate, v.brand_model, v.vehicle_type, v.color, v.description,
              EXISTS (SELECT 1 FROM parking_sessions s WHERE s.plate = v.plate AND s.${ACTIVE_SESSION}) AS has_active_session
         FROM vehicles v
        ORDER BY v.created_at, v.id`,
      { type: QueryTypes.SELECT }
    )
  ]);
  return { users, vehicles };
}

export async function findUser(id) {
  const [user] = await db.query('SELECT id, role, status FROM users WHERE id = :id LIMIT 1', {
    replacements: { id }, type: QueryTypes.SELECT
  });
  return user || null;
}

export async function countActiveAdmins() {
  const [row] = await db.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'",
    { type: QueryTypes.SELECT }
  );
  return Number(row.total) || 0;
}

export async function emailTaken(email, exceptId) {
  const [row] = await db.query('SELECT id FROM users WHERE email = :email AND id <> :exceptId LIMIT 1', {
    replacements: { email, exceptId }, type: QueryTypes.SELECT
  });
  return Boolean(row);
}

export async function updateUser(id, data, passwordHash) {
  const sets = ['full_name = :fullName', 'email = :email', 'phone = :phone', 'role = :role', 'status = :status'];
  if (passwordHash) sets.push('password = :passwordHash', 'failed_attempts = 0', 'lockout_until = NULL');
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`, {
    replacements: { ...data, passwordHash, id }
  });
}

export async function setUserStatus(id, status) {
  await db.query('UPDATE users SET status = :status WHERE id = :id', { replacements: { status, id } });
}

export async function userHasActiveSession(userId) {
  const [row] = await db.query(`SELECT id FROM parking_sessions WHERE user_id = :userId AND ${ACTIVE_SESSION} LIMIT 1`, {
    replacements: { userId }, type: QueryTypes.SELECT
  });
  return Boolean(row);
}

// Los vehículos y notificaciones se borran en cascada; pagos, multas y reportes quedan con user_id NULL (historial)
export async function deleteUser(id) {
  await db.query('DELETE FROM users WHERE id = :id', { replacements: { id } });
}

export async function findVehicle(id) {
  const [vehicle] = await db.query('SELECT id, user_id, plate FROM vehicles WHERE id = :id LIMIT 1', {
    replacements: { id }, type: QueryTypes.SELECT
  });
  return vehicle || null;
}

export async function plateTaken(plate, exceptId = 0) {
  const [row] = await db.query('SELECT id FROM vehicles WHERE plate = :plate AND id <> :exceptId LIMIT 1', {
    replacements: { plate, exceptId }, type: QueryTypes.SELECT
  });
  return Boolean(row);
}

export async function plateHasActiveSession(plate) {
  const [row] = await db.query(`SELECT id FROM parking_sessions WHERE plate = :plate AND ${ACTIVE_SESSION} LIMIT 1`, {
    replacements: { plate }, type: QueryTypes.SELECT
  });
  return Boolean(row);
}

export async function insertVehicle(v) {
  await db.query(
    `INSERT INTO vehicles (user_id, plate, brand_model, vehicle_type, color, description)
     VALUES (:ownerId, :plate, :brandModel, :vehicleType, :color, :description)`,
    { replacements: v }
  );
}

export async function updateVehicle(id, v) {
  await db.query(
    `UPDATE vehicles SET user_id = :ownerId, plate = :plate, brand_model = :brandModel,
            vehicle_type = :vehicleType, color = :color, description = :description
      WHERE id = :id`,
    { replacements: { ...v, id } }
  );
}

export async function deleteVehicle(id) {
  await db.query('DELETE FROM vehicles WHERE id = :id', { replacements: { id } });
}
