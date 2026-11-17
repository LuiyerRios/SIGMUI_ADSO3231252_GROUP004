// HU-004 · Recibo del parqueo en PDF (pdfkit): número, placa, zona y espacio, horario, extensiones, monto y fecha
import PDFDocument from 'pdfkit';
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { formatCOP } from '../utils/paymentFormat.js';

const TIME_ZONE = 'America/Bogota';
const COLORS = { primary: '#2565AE', ink: '#0F172A', muted: '#64748B', line: '#E2E8F0', soft: '#F1F5F9', success: '#15803D' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'long', day: '2-digit', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });

// Sesión pagada por número de recibo, con su dueño, sus extensiones y el nombre del conductor
export async function getReceiptData(receiptNumber) {
  const [session] = await db.query(
    `SELECT ps.id, ps.user_id, ps.receipt_number, ps.plate, ps.zone, ps.space_id, ps.rate_type, ps.quantity,
            ps.amount, ps.start_time, ps.end_time, u.full_name
       FROM parking_sessions ps
       LEFT JOIN users u ON u.id = ps.user_id
      WHERE ps.receipt_number = :receiptNumber AND ps.payment_status = 'paid'
      LIMIT 1`,
    { replacements: { receiptNumber }, type: QueryTypes.SELECT }
  );
  if (!session) return null;
  const extensions = await db.query(
    'SELECT hours, amount, created_at FROM session_extensions WHERE session_id = :id ORDER BY created_at',
    { replacements: { id: session.id }, type: QueryTypes.SELECT }
  );
  return { ...session, extensions };
}

// Arma el PDF en memoria (Buffer) para poder responder con error si algo falla antes de enviarlo
export function buildReceiptPdf(r) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: `Receipt ${r.receipt_number}`, Author: 'Tech Parking' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - 72;
    const extTotal = r.extensions.reduce((sum, e) => sum + Number(e.amount), 0);
    const extHours = r.extensions.reduce((sum, e) => sum + Number(e.hours), 0);
    const isDay = r.rate_type === 'day';
    const base = isDay ? `${r.quantity} day${r.quantity > 1 ? 's' : ''}` : `${r.quantity} h`;

    // Encabezado con el logo
    // Logo de Tech Parking (el mismo del sidebar: cuadro "P" + "tech parking")
    doc.roundedRect(36, 22, 34, 34, 8).fill(COLORS.primary);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('P', 36, 30, { width: 34, align: 'center' });
    doc.fillColor('#0EA5E9').font('Helvetica-Bold').fontSize(15).text('tech', 78, 31, { continued: true })
      .fillColor(COLORS.ink).text('parking');
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(16).text('Parking receipt', 150, 24, { width: width - 114, align: 'right' });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('Blue zone · Simulated payment', 150, 46, { width: width - 114, align: 'right' });
    doc.rect(0, 74, doc.page.width, 4).fill(COLORS.primary);

    // Número de recibo
    doc.moveDown(0);
    doc.fillColor(COLORS.muted).fontSize(9).text('RECEIPT NUMBER', 36, 98);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(18).text(r.receipt_number, 36, 110);
    doc.font('Helvetica').fillColor(COLORS.success).fontSize(9).text('PAID', 36, 112, { width, align: 'right' });

    // Filas de datos
    let y = 146;
    const row = (label, value, bold = false) => {
      doc.moveTo(36, y).lineTo(36 + width, y).strokeColor(COLORS.line).lineWidth(0.7).stroke();
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text(label, 36, y + 8);
      doc.fillColor(COLORS.ink).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).text(String(value), 36, y + 8, { width, align: 'right' });
      y += 28;
    };
    row('Date', fmtDate(r.start_time));
    row('Driver', r.full_name || '—');
    row('Plate', r.plate, true);
    row('Zone · space', `${r.zone} · ${r.space_id || r.zone}`);
    row('Start', fmtTime(r.start_time));
    row('End', fmtTime(r.end_time));
    row('Time purchased', extHours ? `${base} + ${extHours} h extension` : base);
    row('Parking', formatCOP(r.amount));
    if (r.extensions.length) row(`Extensions (${r.extensions.length})`, formatCOP(extTotal));

    // Total
    doc.roundedRect(36, y + 6, width, 44, 8).fill(COLORS.soft);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text('Total paid', 50, y + 22);
    doc.fillColor(COLORS.primary).fontSize(16).text(formatCOP(Number(r.amount) + extTotal), 36, y + 18, { width: width - 14, align: 'right' });

    // Pie
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(
      'Simulated payment for academic purposes (SENA ADSO 3231252 · Team 004). This receipt is not valid for banking purposes.',
      36, doc.page.height - 60, { width, align: 'center' }
    );
    doc.end();
  });
}
