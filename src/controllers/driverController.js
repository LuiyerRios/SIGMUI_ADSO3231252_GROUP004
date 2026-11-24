import {
  getZonesOverview,
  getSpaces,
  getTotals,
  getActiveSessions
} from '../services/driverParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';
import { getVehicleRates } from '../services/vehicleRateService.js';

// Tarifa que se muestra según la clase de la zona (migración 007: el precio depende del tipo de vehículo)
function zoneRateText(zone, rates) {
  if (!zone || !rates.Car) return '—';
  if (zone.vehicleClass === 'motorcycle') return `${formatCOP(rates.Motorcycle.ratePerHour)} / hour`;
  if (zone.vehicleClass === 'bicycle') return `${formatCOP(rates.Bicycle.ratePerHour)} / hour`;
  const general = ['Car', 'SUV', 'Truck', 'Van', 'Other'].map(t => rates[t].ratePerHour);
  return `From ${formatCOP(Math.min(...general))} / hour`;
}

/**
 * Renders the driver home view (HU-003 Find a space).
 */
export async function renderHome(req, res) {
  try {
    const userId = req.session.user.id;

    // 1. Obtener zonas, totales globales y sesiones activas del usuario
    const [zones, totals, activeSessions, rates] = await Promise.all([
      getZonesOverview(),
      getTotals(),
      getActiveSessions(userId),
      getVehicleRates()
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
    const formattedRate = zoneRateText(selectedZoneObj, rates);

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
      formattedRate: '—',
      // HU-003 (#37): mensaje exacto cuando falla el servicio de disponibilidad
      errorMessage: 'Occupancy information temporarily unavailable.'
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

    const [zones, totals, activeSessions, rates] = await Promise.all([
      getZonesOverview(),
      getTotals(),
      getActiveSessions(userId),
      getVehicleRates()
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
      scheduleText: targetZone ? targetZone.scheduleText : '',
      isOpen: targetZone ? targetZone.isOpen : true,
      classLabel: targetZone ? targetZone.classLabel : '',
      formattedRate: zoneRateText(targetZone, rates)
    });
  } catch (error) {
    console.error('Error fetching home data API:', error);
    res.status(500).json({
      error: 'Occupancy information temporarily unavailable.'
    });
  }
}