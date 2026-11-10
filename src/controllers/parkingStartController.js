import { getZoneByCode, getAvailableSpacesByZone } from '../services/parkingStartService.js';
import { getZonesOverview } from '../services/driverParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * Renderiza la vista de inicio de estacionamiento (HU-004).
 * GET /parking/start?zone=A&space=A1
 */
export async function renderStartParking(req, res) {
  try {
    const zones = await getZonesOverview();
    
    // Determinar zona seleccionada
    let zoneCode = req.query.zone;
    let selectedZone = zones.find(z => z.code === zoneCode);

    if (!selectedZone) {
      selectedZone = zones.find(z => z.free > 0) || zones[0];
      zoneCode = selectedZone ? selectedZone.code : 'A';
    }

    // Obtener información de la zona y espacios libres
    const [zoneInfo, availableSpaces] = await Promise.all([
      getZoneByCode(zoneCode),
      getAvailableSpacesByZone(zoneCode)
    ]);

    // Espacio preseleccionado (si viene por query y está en la lista de libres)
    const requestedSpace = req.query.space || '';
    const selectedSpace = availableSpaces.find(s => s.id === requestedSpace) 
      ? requestedSpace 
      : (availableSpaces.length > 0 ? availableSpaces[0].id : '');

    const ratePerHour = zoneInfo ? zoneInfo.ratePerHour : 2000;

    res.render('HU-004', {
      title: 'Start Parking | Tech Parking',
      activeMenu: 'home',
      pageTitle: 'Start parking',
      pageSubtitle: 'Select a space and duration to park',
      zones,
      selectedZoneCode: zoneCode,
      selectedZone,
      selectedSpaceId: selectedSpace,
      availableSpaces,
      ratePerHour,
      formattedRate: `${formatCOP(ratePerHour)} / hour`,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering start parking (HU-004):', error);
    res.status(500).render('HU-004', {
      title: 'Start Parking | Tech Parking',
      activeMenu: 'home',
      pageTitle: 'Start parking',
      pageSubtitle: 'Select a space and duration to park',
      zones: [],
      selectedZoneCode: 'A',
      selectedZone: null,
      selectedSpaceId: '',
      availableSpaces: [],
      ratePerHour: 2000,
      formattedRate: '$2,000 COP / hour',
      errorMessage: 'The parking initialization service is temporarily unavailable.'
    });
  }
}