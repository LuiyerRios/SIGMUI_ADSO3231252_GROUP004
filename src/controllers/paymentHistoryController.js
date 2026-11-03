import { parseFilters } from '../utils/paymentFilters.js';
import { formatCOP, formatPaymentDate } from '../utils/paymentFormat.js';
import { getPayments, getPaymentsForExport } from '../services/paymentHistoryService.js';

export const renderPaymentHistory = async (req, res) => {
  const { filters, error: filterError } = parseFilters(req.query);

  if (filterError) {
    return res.render('HU-017', {
      title: 'Payment History | SIGMUI Admin',
      filters: req.query,
      rows: [],
      pagination: { total: 0, page: 1, totalPages: 1, fromItem: 0, toItem: 0 },
      summary: { revenue: '$0 COP', count: 0, parkingCount: 0, extensionCount: 0, averageTicket: '$0 COP' },
      errorMessage: filterError
    });
  }

  try {
    let currentPage = filters.page;
    let { rows, total, summary } = await getPayments(filters, {
      page: currentPage,
      pageSize: 25
    });

    const totalPages = Math.max(1, Math.ceil(total / 25));

    if (currentPage > totalPages) {
      currentPage = totalPages;
      filters.page = currentPage;
      const reQueryResult = await getPayments(filters, {
        page: currentPage,
        pageSize: 25
      });
      rows = reQueryResult.rows;
      total = reQueryResult.total;
      summary = reQueryResult.summary;
    }

    const formattedRows = rows.map(row => ({
      ...row,
      formattedDate: formatPaymentDate(row.payment_date),
      formattedAmount: formatCOP(row.amount)
    }));

    res.render('HU-017', {
      title: 'Payment History | SIGMUI Admin',
      filters,
      rows: formattedRows,
      pagination: {
        total,
        page: currentPage,
        totalPages,
        fromItem: total > 0 ? (currentPage - 1) * 25 + 1 : 0,
        toItem: Math.min(currentPage * 25, total)
      },
      summary: {
        revenue: formatCOP(summary.revenue),
        count: summary.count,
        parkingCount: summary.parkingCount,
        extensionCount: summary.extensionCount,
        averageTicket: formatCOP(summary.averageTicket)
      },
      errorMessage: null
    });
  } catch (error) {
    console.error('Error in renderPaymentHistory:', error);
    res.status(500).render('HU-017', {
      title: 'Payment History | SIGMUI Admin',
      filters,
      rows: [],
      pagination: { total: 0, page: 1, totalPages: 1, fromItem: 0, toItem: 0 },
      summary: { revenue: '$0 COP', count: 0, parkingCount: 0, extensionCount: 0, averageTicket: '$0 COP' },
      errorMessage: 'The payment history is temporarily unavailable.'
    });
  }
};

export const exportPayments = async (req, res) => {
  const { filters, error: filterError } = parseFilters(req.query);

  if (filterError) {
    return res.status(400).json({ error: filterError });
  }

  try {
    const { rows, summary } = await getPaymentsForExport(filters);

    const formattedRows = rows.map(row => ({
      date: formatPaymentDate(row.payment_date),
      receipt: row.receipt_number,
      plate: row.plate,
      driver: row.driver_name,
      zone: row.zone,
      type: row.type === 'parking' ? 'Parking' : 'Extension',
      amount: row.amount,
      formattedAmount: formatCOP(row.amount)
    }));

    return res.json({
      rows: formattedRows,
      summary: {
        revenue: formatCOP(summary.revenue),
        count: summary.count,
        parkingCount: summary.parkingCount,
        extensionCount: summary.extensionCount,
        averageTicket: formatCOP(summary.averageTicket)
      }
    });
  } catch (error) {
    console.error('Error in exportPayments:', error);
    return res.status(500).json({ error: 'The payment history is temporarily unavailable.' });
  }
};