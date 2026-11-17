// HU-019 (#35) · Validaciones puras de tarifas y reglas por zona (sin BD) para probarlas con Jest

export const ZONE_MESSAGES = {
  saved: 'Zone settings updated successfully.',
  rates: 'Rates must be positive numbers.',
  schedule: 'The closing time must be after the opening time.',
  scheduleFormat: 'Please enter a valid opening and closing time.',
  notFound: 'The zone does not exist.',
  failure: 'Changes cannot be saved due to system failure.'
};

// Tope razonable para evitar errores de digitación (pesos colombianos)
export const MAX_RATE = 1000000;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

// Una tarifa válida es un entero positivo (sin decimales ni letras)
export function parseRate(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const rate = Number(text);
  return rate > 0 && rate <= MAX_RATE ? rate : null;
}

// Convierte "HH:MM" o "HH:MM:SS" a minutos del día; null si el formato no es válido
export function timeToMinutes(value) {
  const match = TIME_REGEX.exec(String(value ?? '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Devuelve "HH:MM" a partir de "HH:MM:SS" (lo que entrega MySQL)
export function toHHMM(value) {
  return String(value ?? '').slice(0, 5);
}

// Acepta true/false, "true"/"false", "on", "1"/"0"
export function parseBoolean(value) {
  return value === true || value === 1 || ['true', 'on', '1'].includes(String(value).toLowerCase());
}

/**
 * Valida los datos editables de una zona.
 * Devuelve { value } o { error } con el mensaje exacto de la historia.
 */
export function validateZoneSettings(body = {}) {
  const ratePerHour = parseRate(body.ratePerHour);
  const ratePerDay = parseRate(body.ratePerDay);
  if (ratePerHour === null || ratePerDay === null) return { error: ZONE_MESSAGES.rates };

  const opens = timeToMinutes(body.opensAt);
  const closes = timeToMinutes(body.closesAt);
  if (opens === null || closes === null) return { error: ZONE_MESSAGES.scheduleFormat };
  if (closes <= opens) return { error: ZONE_MESSAGES.schedule };

  return {
    value: {
      ratePerHour,
      ratePerDay,
      opensAt: `${toHHMM(body.opensAt)}:00`,
      closesAt: `${toHHMM(body.closesAt)}:00`,
      allowsExtension: parseBoolean(body.allowsExtension)
    }
  };
}

// ¿La zona está abierta en el minuto del día indicado? (cierre excluido)
export function isWithinSchedule(opensAt, closesAt, minuteOfDay) {
  const opens = timeToMinutes(opensAt);
  const closes = timeToMinutes(closesAt);
  if (opens === null || closes === null) return true;
  return minuteOfDay >= opens && minuteOfDay < closes;
}

// Texto para la vista: "06:00 – 20:00" o "Open 24 hours"
export function formatSchedule(opensAt, closesAt) {
  const opens = toHHMM(opensAt);
  const closes = toHHMM(closesAt);
  if (opens === '00:00' && closes === '23:59') return 'Open 24 hours';
  return `${opens} – ${closes}`;
}
