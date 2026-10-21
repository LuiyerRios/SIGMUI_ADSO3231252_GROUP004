import { listForUser, getForUser, markRead, markAllRead } from '../services/notificationService.js';
import { formatInboxDate, formatInboxDetailDateTime } from '../utils/inboxFormat.js';
import HelpReport from '../models/HelpReport.js';

export const renderInbox = async (req, res) => {
  const userId = req.session.user.id;
  const activeFilter = req.query.filter || 'all';
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
    } else if (notifications.length > 0) {
      selectedNotification = await getForUser(notifications[0].id, userId);
    }

    if (selectedNotification) {
      if (!selectedNotification.readAt) {
        await markRead(selectedNotification.id, userId);
        selectedNotification.readAt = new Date();

        const listed = notifications.find(n => n.id === selectedNotification.id);
        if (listed) listed.readAt = new Date();
      }

      const item = selectedNotification.toJSON ? selectedNotification.toJSON() : selectedNotification;
      selectedNotification = {
        ...item,
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
  try {
    await markAllRead(userId);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
  const filter = req.query.filter || 'all';
  res.redirect(`/inbox?filter=${filter}`);
};