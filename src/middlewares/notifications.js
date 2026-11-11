import { countUnread } from '../services/notificationService.js';

export async function exposeUnreadCount(req, res, next) {
  res.locals.unreadCount = 0;

  if (req.method === 'GET' && !req.originalUrl.startsWith('/api') && req.session?.user?.id) {
    try {
      res.locals.unreadCount = await countUnread(req.session.user.id);
    } catch (error) {
      console.error('Error counting unread notifications:', error.message);
      res.locals.unreadCount = 0;
    }
  }

  next();
}