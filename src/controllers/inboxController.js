import { listForUser, getForUser, markRead, markAllRead, countUnread } from '../services/notificationService.js';
import { formatInboxDate, formatInboxDetailDateTime } from '../utils/inboxFormat.js';
import HelpReport from '../models/HelpReport.js';
import db from '../config/db.js';

const VALID_FILTERS = ['all', 'unread', 'alerts', 'support'];

export const renderInbox = async (req, res) => {
  const userId = req.session.user.id;
  const rawFilter = req.query.filter;
  const activeFilter = VALID_FILTERS.includes(rawFilter) ? rawFilter : 'all';
  const requestedId = req.query.id;

  try {
    const rawNotifications = await listForUser(userId, activeFilter);

    const notifications = rawNotifications.map(n => {
      const item = n.toJSON ? n.toJSON() : n;
      return {
        ...item,
        formattedDate: formatInboxDate(item.createdAt)
      };
    });

    let selectedNotification = null;

    if (requestedId) {
      try {
        selectedNotification = await getForUser(requestedId, userId);
      } catch (err) {
        if (err.status === 403) {
          return res.status(403).render('errors/error', {
            title: 'Access denied',
            code: 403,
            message: 'You do not have permission to access this message.'
          });
        }
        throw err;
      }

      if (!selectedNotification) {
        return res.status(404).render('errors/error', {
          title: 'Not found',
          code: 404,
          message: 'The page you are looking for does not exist.'
        });
      }

      // Solo se marca como leído cuando se solicita explícitamente con ?id=
      if (!selectedNotification.readAt) {
        await markRead(selectedNotification.id, userId);
        selectedNotification.readAt = new Date();

        const listed = notifications.find(n => n.id === selectedNotification.id);
        if (listed) listed.readAt = new Date();

        // Recalcular contador para reflejar en badge y cabecera
        res.locals.unreadCount = await countUnread(userId);
      }
    } else if (notifications.length > 0) {
      // Si no hay id explícito, selecciona el más reciente para mostrar pero NO lo marca como leído
      selectedNotification = await getForUser(notifications[0].id, userId);
    }

    if (selectedNotification) {
      const item = selectedNotification.toJSON ? selectedNotification.toJSON() : selectedNotification;
      
      const senderName = item.type === 'support_reply' ? 'SIGMUI Support' : 'Tech Parking';

      selectedNotification = {
        ...item,
        senderName,
        formattedDetailDateTime: formatInboxDetailDateTime(item.createdAt)
      };

      if (selectedNotification.type === 'support_reply' && selectedNotification.referenceId) {
        try {
          const report = await HelpReport.findByPk(selectedNotification.referenceId);
          if (report) {
            const paddedId = String(report.id).padStart(4, '0');
            selectedNotification.originalReport = {
              code: `#HR-${paddedId}`,
              description: report.description
            };
          }
        } catch (repErr) {
          console.error('Error fetching original help report for inbox detail:', repErr);
        }
      }

      if (selectedNotification.type === 'parking_alert' && selectedNotification.referenceId) {
        try {
          const [sessions] = await db.query(
            'SELECT space_id, plate, end_time FROM parking_sessions WHERE id = ? LIMIT 1',
            { replacements: [selectedNotification.referenceId] }
          );

          if (sessions && sessions.length > 0) {
            const session = sessions[0];
            const formattedEndTime = new Date(session.end_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });

            selectedNotification.sessionInfo = {
              spaceId: session.space_id || 'unassigned space',
              plate: session.plate,
              endTime: formattedEndTime
            };
          }
        } catch (sessionErr) {
          console.error('Error fetching parking session info for inbox detail:', sessionErr);
        }
      }
    }

    res.render('HU-015', {
      title: 'Inbox | SIGMUI',
      notifications,
      selectedNotification,
      activeFilter,
      errorMessage: null
    });

  } catch (error) {
    console.error('Error loading inbox:', error);
    res.status(500).render('HU-015', {
      title: 'Inbox | SIGMUI',
      notifications: [],
      selectedNotification: null,
      activeFilter,
      errorMessage: 'Messages are currently unavailable.'
    });
  }
};

export const markAllAsRead = async (req, res) => {
  const userId = req.session.user.id;
  const rawFilter = req.query.filter;
  const activeFilter = VALID_FILTERS.includes(rawFilter) ? rawFilter : 'all';

  try {
    await markAllRead(userId);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }

  res.redirect(`/inbox?filter=${activeFilter}`);
};