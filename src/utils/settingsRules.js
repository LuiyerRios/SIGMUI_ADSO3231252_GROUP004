// HU-014 · Validaciones puras de Settings (sin BD) para poder probarlas con Jest
import { normalizePlate, isValidPlate } from './paymentRules.js';
import { normalizeVehicleType, isValidPlateForType, guessVehicleType } from './vehicleTypes.js';

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
  // Tipo de vehículo: si no llega se deduce de la placa (letra al final = moto)
  const vehicleType = body.vehicle_type === undefined ? guessVehicleType(plate) : normalizeVehicleType(body.vehicle_type);
  if (!vehicleType) return { error: 'vehicle_type' };
  if (!isValidPlateForType(plate, vehicleType)) {
    if (vehicleType === 'Bicycle') return { error: 'bicycle_serial' };
    if (vehicleType === 'Motorcycle') return { error: 'plate_moto' };
    return { error: 'plate_invalid' };
  }
  if (brandModel.length > 60) return { error: 'brand_long' };
  return { value: { plate, brandModel: brandModel || null, vehicleType } };
}

// Códigos que viajan en la URL (?ok= / ?error=) → mensaje exacto que ve el usuario
// HU-014 (#31): los textos son los de los criterios de aceptación del issue
export const SETTINGS_MESSAGES = {
  ok: {
    profile: 'Your changes have been saved.',
    password: 'Your changes have been saved.',
    vehicle_added: 'Your changes have been saved.',
    vehicle_removed: 'Your changes have been saved.'
  },
  error: {
    profile: 'Please check your name and phone.',
    password_required: 'Please fill in all the password fields.',
    password_current: 'The current password is incorrect.',
    password_weak: 'The new password does not meet the requirements.',
    password_match: 'Passwords do not match.',
    password_same: 'The new password must be different from the current one.',
    plate_invalid: 'License plate format not recognized.',
    plate_taken: 'This license plate is already registered.',
    brand_long: 'Brand / model must be 60 characters or less.',
    vehicle_type: 'Please select a vehicle type.',
    plate_moto: 'License plate format not recognized. Motorcycles use ABC12D, or ABC123 for older motorcycles.',
    bicycle_serial: 'Please enter the bicycle serial number (4 to 12 letters or numbers).',
    vehicle_active: 'You cannot remove a vehicle with an active parking session.',
    vehicle_last: 'You must keep at least one vehicle registered.',
    vehicle_not_found: 'Vehicle not found.',
    server: 'Something went wrong. Please try again.'
  }
};

export const SETTINGS_TABS = ['profile', 'password', 'vehicles'];