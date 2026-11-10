import { getActiveSessions, getTodayActivity } from '../services/driverParkingService.js';
import { formatCOP } from '../utils/paymentFormat.js';

/**
 * HU-005 · Extend time
 * GET /parking/extend?session=ID
 * Muestra la sesión activa del conductor (o la elegida), las opciones para extender y el historial de hoy.
 * La extensión se paga con POST /api/payments/extension (HU-017).
 */
export async function renderExtendTime(req, res) {
  const userId = req.session.user.id;
  const baseLocals = {
    title: 'Extend time | SIGMUI',
    activeMenu: 'extend_time',
    pageTitle: 'Extend time',
    pageSubtitle: 'Add more time before your session ends'
  };

  try {
    const [activeSessions, todayActivity] = await Promise.all([
      getActiveSessions(userId),
      getTodayActivity(userId)
    ]);

    // Sesión elegida: la de ?session= si es del conductor; si no, la que vence primero
    const requestedId = Number(req.query.session);
    const session = activeSessions.find(s => s.id === requestedId) || activeSessions[0] || null;

    // Opciones de extensión (+1 h a +4 h) con su precio ya formateado
    const options = session
      ? [1, 2, 3, 4].map(hours => ({
          hours,
          amount: hours * session.ratePerHour,
          amountText: formatCOP(hours * session.ratePerHour)
        }))
      : [];

    res.render('HU-005', {
      ...baseLocals,
      activeSessions,
      session,
      sessionView: session
        ? {
            ...session,
            startIso: new Date(session.startTime).toISOString(),
            endIso: new Date(session.endTime).toISOString()
          }
        : null,
      options,
      todayItems: todayActivity.items.map(item => ({
        ...item,
        timeIso: new Date(item.time).toISOString(),
        amountText: formatCOP(item.amount)
      })),
      totalToday: todayActivity.totalToday,
      totalTodayText: formatCOP(todayActivity.totalToday),
      errorMessage: null
    });
  } catch (error) {
    console.error('Error rendering extend time (HU-005):', error);
    res.status(500).render('HU-005', {
      ...baseLocals,
      activeSessions: [],
      session: null,
      sessionView: null,
      options: [],
      todayItems: [],
      totalToday: 0,
      totalTodayText: formatCOP(0),
      errorMessage: 'The parking information is temporarily unavailable.'
    });
  }
}
