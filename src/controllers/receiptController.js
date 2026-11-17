// HU-004 · Descarga del recibo en PDF: GET /parking/receipt/:receiptNumber (solo el conductor dueño del parqueo)
import { getReceiptData, buildReceiptPdf } from '../services/receiptPdfService.js';

const GENERATION_ERROR = 'The receipt could not be generated. Please try again.';

export const downloadReceipt = async (req, res) => {
  const receiptNumber = String(req.params.receiptNumber || '').toUpperCase();
  const wantsJson = req.get('accept')?.includes('application/json');
  const fail = (code, message) => (wantsJson
    ? res.status(code).json({ error: message })
    : res.status(code).render('errors/error', { title: 'Receipt', code, message }));

  if (!/^[A-Z0-9-]{4,40}$/.test(receiptNumber)) return fail(404, 'Receipt not found.');

  try {
    const data = await getReceiptData(receiptNumber);
    if (!data) return fail(404, 'Receipt not found.');
    if (data.user_id !== req.session.user.id) return fail(403, 'You cannot download the receipt of another driver.');

    const pdf = await buildReceiptPdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${data.receipt_number}.pdf"`,
      'Content-Length': pdf.length
    });
    res.send(pdf);
  } catch (err) {
    console.error('Error generating receipt PDF (HU-004):', err);
    fail(500, GENERATION_ERROR);
  }
};
