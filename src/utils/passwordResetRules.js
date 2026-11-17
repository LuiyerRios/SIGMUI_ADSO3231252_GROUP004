// HU-009 · Reglas puras de la recuperación de contraseña (sin BD) para probarlas con Jest
import { isStrongPassword } from './settingsRules.js';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // el enlace funciona 1 hora
export const RESET_LIMIT_PER_HOUR = 3;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const RESET_MESSAGES = {
  emailRequired: 'Enter your email address to continue.',
  emailInvalid: 'Enter a valid email address, for example: name@example.com.',
  notRegistered: 'There is no account associated with this email address.',
  sent: 'We sent you a link to create a new password. Check your inbox; the link works for 1 hour.',
  tooMany: 'Too many requests. Please try again in one hour.',
  mailFailed: 'We could not send the recovery email. Please try again.',
  expired: 'This recovery link has expired. Request a new one.',
  invalid: 'This recovery link is not valid. Request a new one.',
  weak: 'The new password must have at least 8 characters, one uppercase letter and one number.',
  mismatch: 'The passwords do not match.',
  changed: 'Your password was changed successfully. You can now sign in.'
};

export function validateResetEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email) return { error: RESET_MESSAGES.emailRequired };
  if (!EMAIL_REGEX.test(email) || email.length > 255) return { error: RESET_MESSAGES.emailInvalid };
  return { value: email };
}

export function validateNewPassword(body = {}) {
  const password = String(body.password ?? '');
  const confirm = String(body.confirmPassword ?? '');
  if (!isStrongPassword(password)) return { error: RESET_MESSAGES.weak };
  if (password !== confirm) return { error: RESET_MESSAGES.mismatch };
  return { value: password };
}

// Estado de un token de recuperación: valid | expired | invalid
export function classifyResetToken(token, now = new Date()) {
  if (!token || token.usedAt) return 'invalid';
  return new Date(token.expiresAt) <= now ? 'expired' : 'valid';
}
