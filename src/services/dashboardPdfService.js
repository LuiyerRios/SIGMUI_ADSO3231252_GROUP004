// HU-008 (#43) · Reporte del dashboard en PDF (pdfkit): periodo, totales, zonas y sesiones
import PDFDocument from 'pdfkit';
import { formatCOP } from '../utils/paymentFormat.js';

const TIME_ZONE = 'America/Bogota';
const COLORS = { primary: '#2565AE', ink: '#0F172A', muted: '#64748B', line: '#E2E8F0', soft: '#F1F5F9' };
const fmt = (d) => new Date(d).toLocaleString('en-US', { timeZone: TIME_ZONE, month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

// Devuelve un Buffer con el PDF
export function buildDashboardPdf({ period, data, sessions }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(20).text('Tech Parking · Dashboard report');
    doc.moveDown(0.3).fillColor(COLORS.muted).font('Helvetica').fontSize(10)
      .text(`Period: ${period.from} to ${period.to}   ·   Generated: ${fmt(new Date())}`);
    doc.moveDown(1);

    // Totales
    const totals = [
      ['Revenue', formatCOP(data.revenue)],
      ['Paid sessions', String(data.sessions)],
      ['Avg. duration', `${data.avgDurationMinutes} min`],
      ['Fines issued', String(data.finesIssued)]
    ];
    totals.forEach(([label, value]) => {
      doc.fillColor(COLORS.muted).fontSize(10).text(label, { continued: true }).fillColor(COLORS.ink).font('Helvetica-Bold').text(`   ${value}`);
      doc.font('Helvetica');
    });
    if (data.incompleteSessions > 0) {
      doc.moveDown(0.5).fillColor('#B45309').fontSize(9)
        .text(`Warning: ${data.incompleteSessions} session(s) have incomplete data and were not added to the totals.`);
    }

    // Ingresos por zona
    doc.moveDown(1).fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13).text('Revenue by zone');
    doc.font('Helvetica').fontSize(10);
    data.revenueByZone.forEach((z) => doc.fillColor(COLORS.ink).text(`Zone ${z.zone}`, { continued: true }).text(`   ${formatCOP(z.amount)}`));

    // Ocupación por nivel
    doc.moveDown(1).fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13).text('Zones by occupancy level (now)');
    doc.font('Helvetica').fontSize(10);
    data.zoneLevels.forEach((l) => doc.fillColor(COLORS.ink).text(`${l.level}: ${l.count} zone(s) · ${l.percent}%`));

    // Sesiones
    doc.moveDown(1).fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13).text(`Paid sessions (${sessions.length})`);
    doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor(COLORS.muted);
    if (sessions.length === 0) {
      doc.text('No data available');
    } else {
      const cols = [40, 110, 190, 250, 355, 460];
      const row = (vals, color) => {
        const y = doc.y;
        if (y > 780) doc.addPage();
        const yy = doc.y;
        vals.forEach((v, i) => doc.fillColor(color).text(v, cols[i], yy, { width: (cols[i + 1] || 555) - cols[i] - 4, lineBreak: false }));
        doc.moveDown(0.9);
      };
      row(['Plate', 'Type', 'Space', 'Start', 'End', 'Amount'], COLORS.muted);
      sessions.forEach((s) => row([s.plate, s.vehicleType || '—', s.spaceId || s.zone, fmt(s.startTime), fmt(s.endTime), formatCOP(s.amount)], COLORS.ink));
    }
    doc.end();
  });
}
