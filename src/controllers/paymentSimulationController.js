// HU-013 · Simulación de pago (resumen antes de pagar), lista de pagos del conductor y recibos
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import { validateParkingPayment, calculateAmount, calculateEndTime } from '../utils/paymentRules.js';
import { formatCOP } from '../utils/paymentFormat.js';
import { getDriverPayments, getDriverPaymentStats, getDriverReceipt } from '../services/driverPaymentService.js';

// GET /payments/simulate?plate=ABC123&zone=A&rateType=hour&quantity=2
export const renderPaymentSimulation = async (req, res) => {
  const { data, error } = validateParkingPayment(req.query);
  if (error) return res.redirect('/parking/start'); // sin datos válidos se vuelve a elegir en HU-004

  try {
    const [[zone], [vehicle]] = await Promise.all([
      db.query('SELECT code, rate_per_hour, rate_per_day FROM zones WHERE code = :code LIMIT 1', {
        replacements: { code: data.zone }, type: QueryTypes.SELECT
      }),
      db.query('SELECT brand_model FROM vehicles WHERE plate = :plate AND user_id = :userId LIMIT 1', {
        replacements: { plate: data.plate, userId: req.session.user.id }, type: QueryTypes.SELECT
      })
    ]);
    if (!zone) return res.redirect('/parking/start');

    const isDay = data.rateType === 'day';
    const rate = Number(isDay ? zone.rate_per_day : zone.rate_per_hour);
    // El monto que se muestra sale de la misma regla que usa el servidor al guardar el pago
    const amount = calculateAmount(data.rateType, data.quantity, {
      ratePerHour: Number(zone.rate_per_hour),
      ratePerDay: Number(zone.rate_per_day)
    });
    const start = new Date();
    const end = calculateEndTime(start, data.rateType, data.quantity);

    res.render('HU-013', {
      title: 'Payment simulation | SIGMUI',
      activeMenu: 'start_parking',
      pageTitle: 'My payments',
      pageSubtitle: 'Your parking payments and receipts',
      sim: {
        plate: data.plate,
        vehicleText: vehicle ? (vehicle.brand_model || 'No brand / model') : 'Vehicle not registered',
        zone: data.zone,
        rateType: data.rateType,
        quantity: data.quantity,
        durationText: isDay ? `${data.quantity} day${data.quantity > 1 ? 's' : ''}` : `${data.quantity} h`,
        rateLabel: isDay ? 'Daily rate' : 'Hourly rate',
        rateText: `${formatCOP(rate)}/${isDay ? 'day' : 'h'}`,
        baseDurationText: isDay ? `${data.quantity} day${data.quantity > 1 ? 's' : ''}` : `${data.quantity} h`,
        subtotalText: formatCOP(amount),
        feeLabel: 'Simulated fee',
        amountText: formatCOP(amount),
        amountShort: formatCOP(amount).replace(' COP', ''),
        feeText: formatCOP(0),
        startIso: start.toISOString(),
        endIso: end.toISOString()
      }
    });
  } catch (err) {
    console.error('Error loading payment simulation (HU-013):', err);
    res.status(500).render('errors/error', { title: 'Error', code: 500, message: 'The payment simulation is temporarily unavailable.' });
  }
};

// ===================== Payments del conductor (menú "Payments") =====================

// GET /payments · lista de pagos del conductor con acceso a cada recibo
export const renderMyPayments = async (req, res) => {
  const baseLocals = {
    title: 'My payments | SIGMUI',
    activeMenu: 'payments',
    pageTitle: 'My payments',
    pageSubtitle: 'Your parking payments and receipts'
  };

  try {
    const userId = req.session.user.id;
    const [rows, stats] = await Promise.all([getDriverPayments(userId), getDriverPaymentStats(userId)]);

    res.render('HU-013-payments', {
      ...baseLocals,
      payments: rows.map(r => ({
        sessionId: r.session_id,
        paidAtIso: new Date(r.paid_at).toISOString(),
        receiptNumber: r.receipt_number,
        plate: r.plate,
        place: r.space_id ? `${r.zone} · ${r.space_id}` : r.zone,
        type: r.type,
        amountText: formatCOP(r.amount)
      })),
      stats: {
        monthTotal: formatCOP(stats.monthTotal),
        parkingCount: stats.parkingCount,
        extensionCount: stats.extensionCount,
        activeCount: stats.activeCount
      },
      errorMessage: null
    });
  } catch (err) {
    console.error('Error loading driver payments (HU-013):', err);
    res.status(500).render('HU-013-payments', {
      ...baseLocals,
      payments: [],
      stats: { monthTotal: formatCOP(0), parkingCount: 0, extensionCount: 0, activeCount: 0 },
      errorMessage: 'Your payments are temporarily unavailable.'
    });
  }
};

// GET /payments/:id/receipt · recibo de un parqueo pagado (el mismo diseño de la simulación, ya confirmado)
export const renderReceipt = async (req, res) => {
  const sessionId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(sessionId)) return res.redirect('/payments');

  try {
    const s = await getDriverReceipt(req.session.user.id, sessionId);
    if (!s) return res.redirect('/payments'); // no existe o no es de este conductor

    const isDay = s.rate_type === 'day';
    const extHours = Number(s.extensions_hours) || 0;
    const extAmount = Number(s.extensions_amount) || 0;
    const rate = Number(isDay ? s.rate_per_day : s.rate_per_hour) || 0;
    const baseDuration = isDay ? `${s.quantity} day${s.quantity > 1 ? 's' : ''}` : `${s.quantity} h`;
    const space = s.space_id || s.zone;
    const isActive = s.status === 'active' && new Date(s.end_time) > new Date();

    res.render('HU-013', {
      title: `Receipt ${s.receipt_number} | SIGMUI`,
      activeMenu: 'payments',
      pageTitle: 'My payments',
      pageSubtitle: 'Your parking payments and receipts',
      sim: {
        confirmed: true,
        isActive,
        receiptCode: s.receipt_number,
        spaceText: `${s.zone} · ${space}`,
        plate: s.plate,
        vehicleText: s.brand_model || 'No brand / model',
        zone: s.zone,
        rateType: s.rate_type,
        quantity: s.quantity,
        durationText: extHours ? `${baseDuration} + ${extHours} h` : baseDuration,
        baseDurationText: baseDuration,
        rateLabel: isDay ? 'Daily rate' : 'Hourly rate',
        rateText: `${formatCOP(rate)}/${isDay ? 'day' : 'h'}`,
        subtotalText: formatCOP(s.amount),
        feeLabel: 'Extensions',
        feeText: formatCOP(extAmount),
        amountText: formatCOP(Number(s.amount) + extAmount),
        amountShort: formatCOP(Number(s.amount) + extAmount).replace(' COP', ''),
        startIso: new Date(s.start_time).toISOString(),
        endIso: new Date(s.end_time).toISOString()
      }
    });
  } catch (err) {
    console.error('Error loading receipt (HU-013):', err);
    res.redirect('/payments');
  }
};
