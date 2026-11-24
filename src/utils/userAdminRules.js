// HU-016 · Reglas puras de la gestión de usuarios del admin (sin BD) para probarlas con Jest
import { normalizePlate } from './paymentRules.js';
import { VEHICLE_TYPES, isValidPlateForType, plateErrorMessage } from './vehicleTypes.js';
import { isStrongPassword } from './settingsRules.js';

// La vista usa los nombres del diseño; la BD usa los valores del ENUM
export const ROLE_FROM_UI = { Client: 'driver', 'Traffic Agent': 'agent', Admin: 'admin' };
export const ROLE_TO_UI = { driver: 'Client', agent: 'Traffic Agent', admin: 'Admin' };
export const STATUS_FROM_UI = { Active: 'active', Suspended: 'suspended' };
export const STATUS_TO_UI = { active: 'Active', suspended: 'Suspended' };
// Tipos compartidos con HU-004 y HU-014 (incluye Bicycle)
export { VEHICLE_TYPES };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[+\d][\d\s-]{6,19}$/;

// Datos del usuario que edita el admin; devuelve { value } o { error } con el mensaje para la vista
export function validateUserUpdate(body = {}) {
  const fullName = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim();
  const role = ROLE_FROM_UI[body.role];
  const status = STATUS_FROM_UI[body.status];
  const password = String(body.password ?? '');

  if (fullName.length < 3 || fullName.length > 100) return { error: 'The full name must be between 3 and 100 characters.' };
  if (!EMAIL_REGEX.test(email) || email.length > 255) return { error: 'Please enter a valid email address.' };
  if (phone && !PHONE_REGEX.test(phone)) return { error: 'Please enter a valid phone number.' };
  if (!role) return { error: 'Please select a valid user role (Admin, Client, Traffic Agent).' };
  if (!status) return { error: 'Please select a valid status.' };
  if (password && !isStrongPassword(password)) {
    return { error: 'The new password must have at least 8 characters, one uppercase letter and one number.' };
  }
  return { value: { fullName, email, phone: phone || null, role, status, password: password || null } };
}

// Vehículo del formulario; make + model se guardan juntos en brand_model
export function validateVehicleInput(body = {}) {
  const plate = normalizePlate(body.plate);
  const type = String(body.type ?? '');
  const make = String(body.make ?? '').trim();
  const model = String(body.model ?? '').trim();
  const color = String(body.color ?? '').trim();
  const description = String(body.description ?? '').trim();
  const ownerId = Number.parseInt(body.ownerId, 10);

  if (!VEHICLE_TYPES.includes(type)) return { error: 'Please select a vehicle type.' };
  if (!isValidPlateForType(plate, type)) return { error: plateErrorMessage(type) };
  const brandModel = [make, model].filter(Boolean).join(' ');
  if (brandModel.length > 100 || color.length > 40 || description.length > 150) {
    return { error: 'Some vehicle fields are too long.' };
  }
  if (!Number.isInteger(ownerId) || ownerId <= 0) return { error: 'Please select the owner of the vehicle.' };
  return {
    value: {
      plate,
      vehicleType: type,
      brandModel: brandModel || null,
      color: color || null,
      description: description || null,
      ownerId
    }
  };
}

// Reglas de seguridad sobre administradores:
// el admin en sesión no se puede suspender, quitarse el rol ni borrarse, y siempre debe quedar un admin activo
export function checkAdminSafety({ actorId, target, next = null, activeAdmins }) {
  const isSelf = target.id === actorId;
  const targetIsActiveAdmin = target.role === 'admin' && target.status === 'active';

  if (next === null) { // eliminar
    if (isSelf) return 'You cannot delete your own account.';
    if (targetIsActiveAdmin && activeAdmins <= 1) return 'You cannot delete the last active administrator.';
    return null;
  }

  const staysActiveAdmin = next.role === 'admin' && next.status === 'active';
  if (isSelf && next.status !== 'active') return 'You cannot change your own account.';
  if (isSelf && next.role !== 'admin') return 'You cannot change your own account.';
  if (targetIsActiveAdmin && !staysActiveAdmin && activeAdmins <= 1) return 'At least one active administrator must remain.';
  return null;
}
