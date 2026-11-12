import { getDashboard, getExportSessions } from '../services/dashboardService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * Renderiza la vista principal del Dashboard (HU-008).
 * GET /admin/dashboard?range=today|7d|30d
 */
export async function renderDashboard(req, res) {
  try {
    const range = req.query.range || 'today';
    const data = await getDashboard(range);

    const avgH = Math.floor(data.avgDurationMinutes / 60);
    const avgM = data.avgDurationMinutes % 60;
    const formattedAvgDuration = avgH > 0 ? `${avgH}h ${avgM}m` : `${avgM}m`;

    res.render('HU-008', {
      title: 'Administrative Dashboard | Tech Parking',
      activeMenu: 'dashboard',
      pageTitle: 'Dashboard',
      pageSubtitle: 'Reports and statistics of the system',
      range,
      data,
      formattedRevenue: formatCOP(data.revenue),
      formattedAvgDuration,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering dashboard (HU-008):', error);
    res.status(500).render('HU-008', {
      title: 'Administrative Dashboard | Tech Parking',
      activeMenu: 'dashboard',
      pageTitle: 'Dashboard',
      pageSubtitle: 'Reports and statistics of the system',
      range: 'today',
      data: {
        revenue: 0,
        sessions: 0,
        avgDurationMinutes: 0,
        finesIssued: 0,
        occupancyByHour: [],
        peakHourText: '—',
        revenueByZone: [],
        latestSessions: []
      },
      formattedRevenue: '$0 COP',
      formattedAvgDuration: '0m',
      errorMessage: 'The dashboard is temporarily unavailable.'
    });
  }
}

/**
 * Exporta el informe de sesiones del rango seleccionado en formato CSV.
 * GET /admin/dashboard/export?range=today|7d|30d
 */
export async function exportDashboardCsv(req, res) {
  try {
    const range = req.query.range || 'today';
    const sessions = await getExportSessions(range);

    let csvContent = 'Plate,Space,Zone,Start,End,Amount\n';
    
    sessions.forEach(s => {
      const startIso = s.startTime ? new Date(s.startTime).toISOString() : '';
      const endIso = s.endTime ? new Date(s.endTime).toISOString() : '';
      csvContent += `"${s.plate}","${s.spaceId}","${s.zone}","${startIso}","${endIso}",${s.amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard_${range}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting dashboard CSV:', error);
    return res.status(500).send('Error generating CSV export.');
  }
}