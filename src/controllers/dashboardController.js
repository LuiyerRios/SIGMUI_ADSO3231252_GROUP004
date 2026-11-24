import { getDashboard, getExportSessions, resolvePeriod } from '../services/dashboardService.js';
import { buildDashboardPdf } from '../services/dashboardPdfService.js';
import { formatCOP } from '../utils/paymentFormat.js';

const baseLocals = {
  title: 'Dashboard | SIGMUI Admin',
  activeMenu: 'dashboard',
  pageTitle: 'Dashboard',
  pageSubtitle: 'Reports and statistics of the system'
};

// Fecha y hora local de Colombia para el CSV: 2026-11-12 08:40
function formatLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Escapa un valor para CSV (comillas dobles)
const csv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const emptyData = {
  revenue: 0, sessions: 0, avgDurationMinutes: 0, finesIssued: 0,
  occupancyByHour: [], peakHour: null, peakHourText: '—', revenueByZone: [], latestSessions: [],
  zoneLevels: [], incompleteSessions: 0
};

/**
 * HU-008 · GET /admin/dashboard?range=today|7d|30d  o  ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function renderDashboard(req, res) {
  const period = resolvePeriod(req.query);
  const range = period.range;
  if (period.error) {
    return res.status(400).render('HU-008', {
      ...baseLocals, range, period, data: emptyData, noData: false,
      formattedRevenue: formatCOP(0), formattedAvgDuration: '—', errorMessage: period.error
    });
  }
  try {
    const data = await getDashboard(period);
    const avgH = Math.floor(data.avgDurationMinutes / 60);
    const avgM = data.avgDurationMinutes % 60;

    res.render('HU-008', {
      ...baseLocals,
      range,
      period,
      // HU-008 (#43): sin datos en el periodo se muestra "No data available"
      noData: data.sessions === 0 && data.revenue === 0,
      data: {
        ...data,
        revenueByZone: data.revenueByZone.map(z => ({ ...z, amountText: formatCOP(z.amount) })),
        latestSessions: data.latestSessions.map(s => ({ ...s, amountText: formatCOP(s.amount) }))
      },
      formattedRevenue: formatCOP(data.revenue),
      formattedAvgDuration: data.sessions ? (avgH > 0 ? `${avgH}h ${String(avgM).padStart(2, '0')}m` : `${avgM}m`) : '—',
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering dashboard (HU-008):', error);
    res.status(500).render('HU-008', {
      ...baseLocals,
      range,
      period,
      noData: false,
      data: emptyData,
      formattedRevenue: formatCOP(0),
      formattedAvgDuration: '—',
      errorMessage: 'The dashboard is temporarily unavailable.'
    });
  }
}

/**
 * HU-008 · GET /admin/dashboard/export?format=pdf|excel&range=… o &from=…&to=…
 * PDF con pdfkit; Excel como CSV (Excel lo abre directamente).
 */
export async function exportDashboardCsv(req, res) {
  const period = resolvePeriod(req.query);
  if (period.error) return res.status(400).send(period.error);
  const name = `dashboard_${period.from}_${period.to}`;
  try {
    const sessions = await getExportSessions(period);

    if (req.query.format === 'pdf') {
      const data = await getDashboard(period);
      const pdf = await buildDashboardPdf({ period, data, sessions });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`);
      return res.status(200).send(pdf);
    }

    let content = 'Plate,Vehicle type,Space,Zone,Start,End,Amount\n';
    sessions.forEach(s => {
      content += [csv(s.plate), csv(s.vehicleType || ''), csv(s.spaceId), csv(s.zone), csv(formatLocal(s.startTime)), csv(formatLocal(s.endTime)), Number(s.amount)].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    res.status(200).send('﻿' + content); // BOM para que Excel lea bien los acentos
  } catch (error) {
    console.error('Error exporting dashboard CSV:', error);
    res.status(500).send('The dashboard is temporarily unavailable.');
  }
}