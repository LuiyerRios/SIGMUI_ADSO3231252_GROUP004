import crypto from 'crypto';

export function normalizePlate(plate) {
  const str = String(plate ?? '');
  return str.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidPlate(plate) {
  const normalized = normalizePlate(plate);
  // Formato colombia: AAA123 (carro) o AAA12A (moto)
  const plateRegex = /^[A-Z]{3}\d{2}[A-Z0-9]$/;
  return plateRegex.test(normalized);
}

export function validateParkingPayment(body = {}) {
  const plate = normalizePlate(body.plate);
  if (!isValidPlate(plate)) {
    return { error: { message: 'Please enter a valid plate.', status: 400 } };
  }

  const zone = String(body.zone ?? '').trim().toUpperCase();
  if (!/^[A-F]$/.test(zone)) {
    return { error: { message: 'Please select a valid zone.', status: 400 } };
  }

  const rawSpaceId = String(body.spaceId ?? '').trim().toUpperCase();
  const spaceId = rawSpaceId.length > 0 ? rawSpaceId : null;

  if (spaceId) {
    if (!/^[A-F]\d{1,2}$/.test(spaceId) || !spaceId.startsWith(zone)) {
      return { error: { message: 'Please select a valid zone.', status: 400 } };
    }
  }

  const rateType = String(body.rateType ?? '').trim();
  if (!['hour', 'day'].includes(rateType)) {
    return { error: { message: 'Please enter a valid quantity.', status: 400 } };
  }

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: { message: 'Please enter a valid quantity.', status: 400 } };
  }

  if (rateType === 'hour' && (quantity < 1 || quantity > 12)) {
    return { error: { message: 'Please enter a valid quantity.', status: 400 } };
  }

  if (rateType === 'day' && (quantity < 1 || quantity > 7)) {
    return { error: { message: 'Please enter a valid quantity.', status: 400 } };
  }

  return {
    data: { plate, zone, spaceId, rateType, quantity },
    error: null
  };
}

export function validateExtensionPayment(body = {}) {
  const sessionId = Number(body.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return { error: { message: 'Parking session not found.', status: 404 } };
  }

  const hours = Number(body.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
    return { error: { message: 'Please enter a valid quantity.', status: 400 } };
  }

  return {
    data: { sessionId, hours },
    error: null
  };
}

export function calculateAmount(rateType, quantity, { ratePerHour, ratePerDay }) {
  if (rateType === 'hour') {
    return quantity * ratePerHour;
  }
  if (rateType === 'day') {
    return quantity * ratePerDay;
  }
  return 0;
}

export function calculateEndTime(start, rateType, quantity) {
  const startTime = new Date(start);
  const endTime = new Date(startTime);

  if (rateType === 'hour') {
    endTime.setHours(endTime.getHours() + quantity);
  } else if (rateType === 'day') {
    endTime.setDate(endTime.getDate() + quantity);
  }

  return endTime;
}

export function buildReceiptNumber(date = new Date(), randomFn) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  let randomChars = '';
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < 6; i++) {
    const randomIndex = randomFn ? randomFn() % charset.length : crypto.randomInt(0, charset.length);
    randomChars += charset[randomIndex];
  }

  return `TP-${year}${month}${day}-${randomChars}`;
}