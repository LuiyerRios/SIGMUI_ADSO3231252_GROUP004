// HU-019 (#35) · Tarifas y reglas por zona (solo admin)
import { listZoneSettings, updateZoneSettings } from '../services/zoneAdminService.js';
import { validateZoneSettings, validateVehicleRate, ZONE_MESSAGES } from '../utils/zoneRules.js';
import { getVehicleRates, updateVehicleRate } from '../services/vehicleRateService.js';
import { VEHICLE_TYPES, VEHICLE_ICONS, ZONE_CLASS_LABELS, normalizeVehicleType } from '../utils/vehicleTypes.js';
import { formatCOP } from '../utils/paymentFormat.js';

const layoutLocals = {
  title: 'Zone rates | Tech Parking',
  activeMenu: 'zone_rates',
  pageTitle: 'Zone rates',
  pageSubtitle: 'Rates by vehicle type, and which vehicles, hours and extensions each zone allows'
};

const withTexts = (zone) => ({ ...zone });

// Tarifas por tipo listas para la vista
async function rateRows() {
  const rates = await getVehicleRates();
  return VEHICLE_TYPES.map(type => ({
    type,
    icon: VEHICLE_ICONS[type],
    ...rates[type],
    hourText: formatCOP(rates[type].ratePerHour),
    dayText: formatCOP(rates[type].ratePerDay)
  }));
}

// GET /admin/zones
export async function renderZoneSettings(req, res) {
  try {
    const [zones, rates] = await Promise.all([listZoneSettings(), rateRows()]);
    res.render('HU-019', { ...layoutLocals, zones: zones.map(withTexts), rates, zoneClassLabels: ZONE_CLASS_LABELS, errorMessage: null });
  } catch (error) {
    console.error('Zone settings error:', error);
    res.status(500).render('HU-019', {
      ...layoutLocals,
      zones: [],
      rates: [],
      zoneClassLabels: ZONE_CLASS_LABELS,
      errorMessage: 'The zone settings are temporarily unavailable.'
    });
  }
}

// GET /api/admin/zones
export async function listZones(req, res) {
  try {
    res.json({ zones: (await listZoneSettings()).map(withTexts) });
  } catch (error) {
    console.error('List zones error:', error);
    res.status(500).json({ error: 'The zone settings are temporarily unavailable.' });
  }
}

// PUT /api/admin/zones/:code
export async function saveZone(req, res) {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^[A-Z]{1,5}$/.test(code)) {
    return res.status(404).json({ error: ZONE_MESSAGES.notFound });
  }

  const { value, error } = validateZoneSettings(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const zone = await updateZoneSettings(code, value);
    if (!zone) return res.status(404).json({ error: ZONE_MESSAGES.notFound });
    res.json({ message: ZONE_MESSAGES.saved, zone: withTexts(zone) });
  } catch (err) {
    console.error('Save zone error:', err);
    res.status(500).json({ error: ZONE_MESSAGES.failure });
  }
}

// PUT /api/admin/vehicle-rates/:type · Migración 007: tarifa por tipo de vehículo
export async function saveVehicleRate(req, res) {
  const type = normalizeVehicleType(req.params.type);
  if (!type) return res.status(404).json({ error: ZONE_MESSAGES.rateType });

  const { value, error } = validateVehicleRate(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const rate = await updateVehicleRate(type, value);
    res.json({
      message: ZONE_MESSAGES.rateSaved,
      rate: { type, ...rate, hourText: formatCOP(rate.ratePerHour), dayText: formatCOP(rate.ratePerDay) }
    });
  } catch (err) {
    console.error('Save vehicle rate error:', err);
    res.status(500).json({ error: ZONE_MESSAGES.failure });
  }
}
