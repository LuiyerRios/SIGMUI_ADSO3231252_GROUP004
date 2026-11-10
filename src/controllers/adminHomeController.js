import { getAdminSpaces, getAdminStats, getConfig } from '../services/adminParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * Renderiza el panel principal de zonas de parqueo (HU-010).
 * GET /admin
 */
export async function renderAdminHome(req, res) {
  try {
    const [spaces, stats, config] = await Promise.all([
      getAdminSpaces(),
      getAdminStats(),
      getConfig()
    ]);

    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const todayText = now.toLocaleDateString('en-US', options);

    const selectedZoneCode = req.query.zone || (config.zones.length > 0 ? config.zones[0] : 'A');

    res.render('HU-010', {
      title: 'Parking Zones | Tech Parking',
      activeMenu: 'zones',
      pageTitle: 'Parking zones',
      pageSubtitle: `Live occupancy of the blue zones · ${todayText}`,
      spaces,
      stats,
      config,
      selectedZoneCode,
      formattedRevenue: formatCOP(stats.todayRevenue),
      todayText,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering admin home (HU-010):', error);
    res.status(500).render('HU-010', {
      title: 'Parking Zones | Tech Parking',
      activeMenu: 'zones',
      pageTitle: 'Parking zones',
      pageSubtitle: 'Live occupancy of the blue zones',
      spaces: [],
      stats: { total: 0, free: 0, occupied: 0, occupancyPercent: 0, zonesCount: 0, todayBookings: 0, todayRevenue: 0 },
      config: { spacesPerZone: 32, zones: ['A', 'B', 'C', 'D'] },
      selectedZoneCode: 'A',
      formattedRevenue: '$0 COP',
      todayText: '',
      errorMessage: 'The system cannot retrieve parking data.'
    });
  }
}