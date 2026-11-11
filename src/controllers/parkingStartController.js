import { getZonesOverview, getUserVehicles, getActiveSessions } from '../services/driverParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * HU-004 · Start parking
 * GET /parking/start?zone=A
 * Muestra las zonas con espacios libres, los vehículos del conductor y sus sesiones activas.
 * El espacio NO se elige aquí: lo asigna el servidor al pagar (primer espacio libre de la zona).
 */
export async function renderStartParking(req, res) {
  const userId = req.session.user.id;
  const baseLocals = {
    title: 'Start parking | SIGMUI',
    activeMenu: 'start_parking',
    pageTitle: 'Start parking',
    pageSubtitle: 'Pick a zone, your vehicle and the time'
  };

  try {
    const [zones, vehicles, activeSessions] = await Promise.all([
      getZonesOverview(),
      getUserVehicles(userId),
      getActiveSessions(userId)
    ]);

    // Zona preseleccionada: la de ?zone= si tiene espacios libres; si no, la primera con espacios libres
    const requested = String(req.query.zone || '').toUpperCase();
    const selectedZone =
      zones.find(z => z.code === requested && z.free > 0) ||
      zones.find(z => z.free > 0) ||
      null;

    // Tarifas ya formateadas para que la vista y el JS no repitan el formato
    const zonesView = zones.map(z => ({
      ...z,
      rateHourText: formatCOP(z.ratePerHour),
      rateDayText: formatCOP(z.ratePerDay)
    }));

    res.render('HU-004', {
      ...baseLocals,
      zones: zonesView,
      vehicles,
      activeSessions,
      selectedZoneCode: selectedZone ? selectedZone.code : null,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering start parking (HU-004):', error);
    res.status(500).render('HU-004', {
      ...baseLocals,
      zones: [],
      vehicles: [],
      activeSessions: [],
      selectedZoneCode: null,
      errorMessage: 'The parking information is temporarily unavailable.'
    });
  }
}
