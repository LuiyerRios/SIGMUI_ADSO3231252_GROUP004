// Tarifas por tipo de vehículo (migración 007). El precio del parqueo ya no depende de la zona.
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { VEHICLE_TYPES, DEFAULT_VEHICLE_RATES, DAY_RATE_FACTOR, normalizeVehicleType } from '../utils/vehicleTypes.js';

// Devuelve { Car: { ratePerHour, ratePerDay }, … } con todos los tipos (los que falten usan el valor por defecto)
export async function getVehicleRates(options = {}) {
  const rows = await db.query('SELECT vehicle_type, rate_per_hour, rate_per_day FROM vehicle_rates', {
    type: QueryTypes.SELECT,
    ...options
  });
  const byType = Object.fromEntries(rows.map(r => [r.vehicle_type, r]));
  return Object.fromEntries(VEHICLE_TYPES.map(t => {
    const r = byType[t];
    const hour = r ? Number(r.rate_per_hour) : DEFAULT_VEHICLE_RATES[t];
    const day = r ? Number(r.rate_per_day) : hour * DAY_RATE_FACTOR;
    return [t, { ratePerHour: hour, ratePerDay: day }];
  }));
}

// Tarifa de un tipo; un tipo desconocido cobra como "Other"
export async function getRateFor(type, options = {}) {
  const rates = await getVehicleRates(options);
  return rates[normalizeVehicleType(type) || 'Other'];
}

// HU-019 · El admin cambia la tarifa de un tipo
export async function updateVehicleRate(type, { ratePerHour, ratePerDay }) {
  await db.query(
    `INSERT INTO vehicle_rates (vehicle_type, rate_per_hour, rate_per_day)
     VALUES (:type, :ratePerHour, :ratePerDay)
     ON DUPLICATE KEY UPDATE rate_per_hour = VALUES(rate_per_hour), rate_per_day = VALUES(rate_per_day)`,
    { replacements: { type, ratePerHour, ratePerDay } }
  );
  return (await getVehicleRates())[type];
}
