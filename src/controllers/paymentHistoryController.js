import { getPayments, getPaymentsForExport } from '../services/paymentHistoryService.js';
import { parseFilters } from '../utils/paymentFilters.js';

export async function showPaymentHistory(req, res) {
  try {
    const { filters, error } = parseFilters(req.query);

    if (error) {
      return res.render('HU-017', {
        title: 'Payment History | SIGMUI Admin',
        activeMenu: 'payments',
        pageTitle: 'Payment history',
        pageSubtitle: 'Audit every payment of the system',
        errorMessage: error,
        filters: req.query,
        summary: { revenue: '$0 COP', count: 0, parkingCount: 0, extensionCount: 0, averageTicket: '$0 COP' },
        rows: [],
        pagination: { page: 1, totalPages: 1, total: 0, fromItem: 0, toItem: 0 }
      });
    }

    const data = await getPayments(filters);

    res.render('HU-017', {
      title: 'Payment History | SIGMUI Admin',
      activeMenu: 'payments',
      pageTitle: 'Payment history',
      pageSubtitle: 'Audit every payment of the system',
      errorMessage: null,
      filters: data.filters,
      summary: data.summary,
      rows: data.rows,
      pagination: data.pagination
    });
  } catch (err) {
    console.error('Error in showPaymentHistory:', err);
    res.render('HU-017', {
      title: 'Payment History | SIGMUI Admin',
      activeMenu: 'payments',
      pageTitle: 'Payment history',
      pageSubtitle: 'Audit every payment of the system',
      errorMessage: 'The payment history is temporarily unavailable.',
      filters: { from: '', to: '', zone: 'all', plate: '', page: 1 },
      summary: { revenue: '$0 COP', count: 0, parkingCount: 0, extensionCount: 0, averageTicket: '$0 COP' },
      rows: [],
      pagination: { page: 1, totalPages: 1, total: 0, fromItem: 0, toItem: 0 }
    });
  }
}

export async function exportPayments(req, res) {
  try {
    const { filters, error } = parseFilters(req.query);

    if (error) {
      return res.status(400).json({ error });
    }

    const data = await getPaymentsForExport(filters);
    res.json(data);
  } catch (err) {
    console.error('Error in exportPayments:', err);
    res.status(500).json({ error: 'The payment history is temporarily unavailable.' });
  }
}

// Alias para compatibilidad con la importación en src/routes/adminRoutes.js
export const renderPaymentHistory = showPaymentHistory;