// HU-006 / HU-007 · Reglas puras del agente de tránsito (sin BD) para probarlas con Jest
import { isValidPlate } from './paymentRules.js';

export const FINE_AMOUNT = 100000; // valor de la multa del mockup de HU-007 ($100.000 COP)
export const TIME_ZONE = 'America/Bogota';

// La placa que escribe el agente: sin vacíos, sin caracteres especiales y con formato AAA123 / AAA12A
export function validatePlateInput(raw) {
  const text = String(raw ?? '');
  if (!text.trim()) return { error: 'Please enter a license plate.' };
  if (/[^A-Za-z0-9\s-]/.test(text)) return { error: 'Special characters are not allowed in the license plate.' };
  const plate = text.toUpperCase().replace(/[\s-]/g, '');
  if (!isValidPlate(plate)) return { error: 'Invalid license plate. Use ABC123 for cars or ABC12D for motorcycles.' };
  return { value: plate };
}

// Estado de la placa según su última sesión pagada: active | expired | not_registered
export function classifyPlate(session, now = new Date()) {
  if (!session) return 'not_registered';
  const end = new Date(session.end_time);
  return session.status === 'active' && end > now ? 'active' : 'expired';
}

// "1 h 40 min" a partir de milisegundos
export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Hora y fecha en hora de Colombia
export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });
export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'long', day: '2-digit', year: 'numeric' });

// Número de multa único y legible: FN-261117-4K7Q2P (fecha de Colombia + 6 caracteres aleatorios)
export function generateFineNumber(now = new Date(), random = Math.random) {
  const ymd = new Date(now).toLocaleDateString('en-CA', { timeZone: TIME_ZONE }).replace(/-/g, '').slice(2);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) suffix += alphabet[Math.floor(random() * alphabet.length)];
  return `FN-${ymd}-${suffix}`;
}

// Datos del formulario de la multa
export function validateFineInput(body = {}) {
  const plateCheck = validatePlateInput(body.plate);
  if (plateCheck.error) return { error: plateCheck.error };
  const location = String(body.location ?? '').trim();
  const comments = String(body.comments ?? '').trim();
  if (location.length < 3 || location.length > 150) return { error: 'Please enter the current location (3 to 150 characters).' };
  if (comments.length > 300) return { error: 'Comments must be 300 characters or less.' };
  return { value: { plate: plateCheck.value, location, comments: comments || null } };
}
