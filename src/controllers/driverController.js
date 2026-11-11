import {
  getZonesOverview,
  getSpaces,
  getTotals,
  getActiveSessions
} from '../services/driverParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * Renders the driver home view (HU-003 Find a space).
 */
export async function renderHome(req, res) {
  try {
    const userId = req.session.user.id;

    // 1. Obtener zonas, totales globales y sesiones activas del usuario
    const [zones, totals, activeSessions] = await Promise.all([
      getZonesOverview(),
      getTotals(),
      getActiveSessions(userId)
    ]);

    // 2. Determinar zona inicial seleccionada
    let selectedZoneCode = req.query.zone;
    let selectedZoneObj = zones.find(z => z.code === selectedZoneCode);

    if (!selectedZoneObj) {
      // Si la zona solicitada no existe, buscar la primera zona que tenga espacios libres
      selectedZoneObj = zones.find(z => z.free > 0) || zones[0];
      selectedZoneCode = selectedZoneObj ? selectedZoneObj.code : 'A';
    }

    // 3. Obtener espacios de la zona seleccionada
    const spaces = selectedZoneObj ? await getSpaces(selectedZoneCode) : [];

    // Formatear tarifa por hora para la vista
    const formattedRate = selectedZoneObj
      ? `${formatCOP(selectedZoneObj.ratePerHour)} / hour`
      : '$2,000 COP / hour';

    res.render('HU-003', {
      title: 'Find a Space | Tech Parking',
      activeMenu: 'home',
      pageTitle: 'Find a space',
      pageSubtitle: 'Available blue-zone spaces near you',
      zones,
      totals,
      activeSessions,
      selectedZone: selectedZoneObj,
      spaces,
      formattedRate,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering driver home (HU-003):', error);
    res.status(500).render('HU-003', {
      title: 'Find a Space | Tech Parking',
      activeMenu: 'home',
      pageTitle: 'Find a space',
      pageSubtitle: 'Available blue-zone spaces near you',
      zones: [],
      totals: { total: 0, free: 0, occupied: 0, occupancyPercent: 0 },
      activeSessions: [],
      selectedZone: null,
      spaces: [],
      formattedRate: '$2,000 COP / hour',
      errorMessage: 'The parking information is temporarily unavailable.'
    });
  }
}

/**
 * API endpoint to retrieve updated parking data via AJAX polling.
 * GET /zones/data?zone=A
 */
export async function homeData(req, res) {
  try {
    const userId = req.session.user.id;
    const requestedZone = req.query.zone || 'A';

    const [zones, totals, activeSessions] = await Promise.all([
      getZonesOverview(),
      getTotals(),
      getActiveSessions(userId)
    ]);

    let targetZone = zones.find(z => z.code === requestedZone);
    if (!targetZone && zones.length > 0) {
      targetZone = zones[0];
    }

    const spaces = targetZone ? await getSpaces(targetZone.code) : [];

    res.json({
      zones,
      totals,
      spaces,
      activeSessions,
      selectedZoneCode: targetZone ? targetZone.code : requestedZone,
      formattedRate: targetZone ? `${formatCOP(targetZone.ratePerHour)} / hour` : '$2,000 COP / hour'
    });
  } catch (error) {
    console.error('Error fetching home data API:', error);
    res.status(500).json({
      error: 'The parking information is temporarily unavailable.'
    });
  }
}