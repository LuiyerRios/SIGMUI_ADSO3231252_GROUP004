// HU-014 · Validaciones puras de Settings (sin BD) para poder probarlas con Jest
import { normalizePlate, isValidPlate } from './paymentRules.js';

const PHONE_REGEX = /^[+\d][\d\s-]{6,19}$/;

// Perfil: nombre 3–100 caracteres; teléfono opcional (dígitos, espacios, + y -)
export function validateProfile(body = {}) {
  const fullName = String(body.full_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  if (fullName.length < 3 || fullName.length > 100) return { error: 'profile' };
  if (phone && !PHONE_REGEX.test(phone)) return { error: 'profile' };
  return { value: { fullName, phone: phone || null } };
}

// Misma regla de HU-002: mínimo 8 caracteres, una mayúscula y un número
export function isStrongPassword(password) {
  const value = String(password ?? '');
  return value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

// Cambio de contraseña: devuelve el código de error (el controlador lo traduce al mensaje)
export function validatePasswordChange(body = {}) {
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');
  if (!currentPassword || !newPassword) return { error: 'password_required' };
  if (!isStrongPassword(newPassword)) return { error: 'password_weak' };
  if (newPassword !== confirmPassword) return { error: 'password_match' };
  if (newPassword === currentPassword) return { error: 'password_same' };
  return { value: { currentPassword, newPassword } };
}

// Vehículo: placa colombiana (AAA123 carro / AAA12A moto) y marca/modelo opcional hasta 60
export function validateVehicle(body = {}) {
  const plate = normalizePlate(body.plate);
  const brandModel = String(body.brand_model ?? '').trim();
  if (!isValidPlate(plate)) return { error: 'plate_invalid' };
  if (brandModel.length > 60) return { error: 'brand_long' };
  return { value: { plate, brandModel: brandModel || null } };
}

// Códigos que viajan en la URL (?ok= / ?error=) → mensaje exacto que ve el usuario
export const SETTINGS_MESSAGES = {
  ok: {
    profile: 'Your profile was updated.',
    password: 'Your password was changed.',
    vehicle_added: 'Vehicle added.',
    vehicle_removed: 'Vehicle removed.'
  },
  error: {
    profile: 'Please check your name and phone.',
    password_required: 'Please fill in all the password fields.',
    password_current: 'Your current password is incorrect.',
    password_weak: 'The new password does not meet the requirements.',
    password_match: 'The passwords do not match.',
    password_same: 'The new password must be different from the current one.',
    plate_invalid: 'Please enter a valid plate.',
    plate_taken: 'This plate is already registered.',
    brand_long: 'Brand / model must be 60 characters or less.',
    vehicle_active: 'You cannot remove a vehicle with an active parking session.',
    vehicle_not_found: 'Vehicle not found.',
    server: 'Something went wrong. Please try again.'
  }
};

export const SETTINGS_TABS = ['profile', 'password', 'vehicles'];