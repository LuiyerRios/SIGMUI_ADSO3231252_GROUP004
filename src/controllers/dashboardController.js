import { getDashboard, getExportSessions, normalizeRange } from '../services/dashboardService.js';
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

/**
 * HU-008 · GET /admin/dashboard?range=today|7d|30d
 */
export async function renderDashboard(req, res) {
  const range = normalizeRange(req.query.range);
  try {
    const data = await getDashboard(range);
    const avgH = Math.floor(data.avgDurationMinutes / 60);
    const avgM = data.avgDurationMinutes % 60;

    res.render('HU-008', {
      ...baseLocals,
      range,
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
      data: {
        revenue: 0, sessions: 0, avgDurationMinutes: 0, finesIssued: 0,
        occupancyByHour: [], peakHour: null, peakHourText: '—', revenueByZone: [], latestSessions: []
      },
      formattedRevenue: formatCOP(0),
      formattedAvgDuration: '—',
      errorMessage: 'The dashboard is temporarily unavailable.'
    });
  }
}

/**
 * HU-008 · GET /admin/dashboard/export?range=today|7d|30d → CSV
 */
export async function exportDashboardCsv(req, res) {
  const range = normalizeRange(req.query.range);
  try {
    const sessions = await getExportSessions(range);
    let content = 'Plate,Space,Zone,Start,End,Amount\n';
    sessions.forEach(s => {
      content += [csv(s.plate), csv(s.spaceId), csv(s.zone), csv(formatLocal(s.startTime)), csv(formatLocal(s.endTime)), Number(s.amount)].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard_${range}.csv"`);
    res.status(200).send('﻿' + content); // BOM para que Excel lea bien los acentos
  } catch (error) {
    console.error('Error exporting dashboard CSV:', error);
    res.status(500).send('The dashboard is temporarily unavailable.');
  }
}