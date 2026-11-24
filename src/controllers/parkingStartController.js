import { getZonesOverview, getUserVehicles, getActiveSessions, getFreeSpacesByZone } from '../services/driverParkingService.js';
import { VEHICLE_TYPES } from '../utils/vehicleTypes.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * HU-004 · Start parking
 * GET /parking/start?zone=A&space=A26
 * Muestra las zonas con espacios libres, los vehículos del conductor y sus sesiones activas.
 * El conductor puede elegir el espacio (o venir con él desde el mapa de HU-003 con ?space=);
 * si deja "Auto", el servidor asigna el primer espacio libre de la zona al pagar.
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
    const [zones, vehicles, activeSessions, freeSpaces] = await Promise.all([
      getZonesOverview(),
      getUserVehicles(userId),
      getActiveSessions(userId),
      getFreeSpacesByZone()
    ]);

    // Zona preseleccionada: la de ?zone= si tiene espacios libres; si no, la primera con espacios libres
    // Si llega ?space=A26 desde el mapa, su zona manda sobre ?zone=
    const requestedSpace = String(req.query.space || '').toUpperCase();
    const requested = /^[A-F]\d{1,2}$/.test(requestedSpace)
      ? requestedSpace.charAt(0)
      : String(req.query.zone || '').toUpperCase();
    const selectedZone =
      zones.find(z => z.code === requested && z.free > 0 && z.isOpen) ||
      zones.find(z => z.free > 0 && z.isOpen) ||
      null;

    // Tarifas ya formateadas para que la vista y el JS no repitan el formato
    const zonesView = zones.map(z => ({
      ...z,
      rateHourText: formatCOP(z.ratePerHour),
      rateDayText: formatCOP(z.ratePerDay)
    }));

    // El espacio pedido solo se preselecciona si sigue libre y es de la zona elegida
    const zoneFree = selectedZone ? (freeSpaces[selectedZone.code] || []) : [];
    const selectedSpaceId = zoneFree.includes(requestedSpace) ? requestedSpace : '';
    const spaceNotice = requestedSpace && !selectedSpaceId
      ? `Space ${requestedSpace} is no longer available. Pick another one or leave it on Auto.`
      : null;

    res.render('HU-004', {
      ...baseLocals,
      zones: zonesView,
      vehicles,
      vehicleTypes: VEHICLE_TYPES,
      activeSessions,
      freeSpaces,
      selectedZoneCode: selectedZone ? selectedZone.code : null,
      selectedSpaceId,
      spaceNotice,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering start parking (HU-004):', error);
    res.status(500).render('HU-004', {
      ...baseLocals,
      zones: [],
      vehicles: [],
      vehicleTypes: VEHICLE_TYPES,
      activeSessions: [],
      freeSpaces: {},
      selectedZoneCode: null,
      selectedSpaceId: '',
      spaceNotice: null,
      errorMessage: 'The parking information is temporarily unavailable.'
    });
  }
}
