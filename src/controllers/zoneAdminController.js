// HU-018 (#35) · Tarifas y reglas por zona (solo admin)
import { listZoneSettings, updateZoneSettings } from '../services/zoneAdminService.js';
import { validateZoneSettings, ZONE_MESSAGES } from '../utils/zoneRules.js';
import { formatCOP } from '../utils/paymentFormat.js';

const layoutLocals = {
  title: 'Zone rates | Tech Parking',
  activeMenu: 'zone_rates',
  pageTitle: 'Zone rates',
  pageSubtitle: 'Rates, service hours and extension rules of each blue zone'
};

const withTexts = (zone) => ({
  ...zone,
  rateHourText: formatCOP(zone.ratePerHour),
  rateDayText: formatCOP(zone.ratePerDay)
});

// GET /admin/zones
export async function renderZoneSettings(req, res) {
  try {
    const zones = (await listZoneSettings()).map(withTexts);
    res.render('HU-018-zones', { ...layoutLocals, zones, errorMessage: null });
  } catch (error) {
    console.error('Zone settings error:', error);
    res.status(500).render('HU-018-zones', {
      ...layoutLocals,
      zones: [],
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
