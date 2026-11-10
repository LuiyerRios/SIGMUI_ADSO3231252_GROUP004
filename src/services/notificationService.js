import db from '../config/db.js';
import Notification from '../models/Notification.js';

export async function countUnread(userId) {
  if (!userId) return 0;
  return await Notification.count({
    where: {
      userId,
      readAt: null
    }
  });
}

export async function listForUser(userId, filter = 'all') {
  if (!userId) return [];

  const whereClause = { userId };

  if (filter === 'unread') {
    whereClause.readAt = null;
  } else if (filter === 'alerts') {
    whereClause.type = 'parking_alert';
  } else if (filter === 'support') {
    whereClause.type = 'support_reply';
  }

  return await Notification.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
    limit: 50
  });
}

export async function getForUser(id, userId) {
  const notification = await Notification.findByPk(id);

  if (!notification) {
    return null;
  }

  if (notification.userId !== Number(userId)) {
    const error = new Error('You do not have permission to access this message.');
    error.status = 403;
    throw error;
  }

  return notification;
}

export async function markRead(id, userId) {
  const notification = await getForUser(id, userId);
  if (notification && !notification.readAt) {
    await notification.update({ readAt: new Date() });
  }
  return notification;
}

export async function markAllRead(userId) {
  if (!userId) return;
  await Notification.update(
    { readAt: new Date() },
    {
      where: {
        userId,
        readAt: null
      }
    }
  );
}

export async function notifySupportReply(helpReport) {
  if (!helpReport || !helpReport.userId) {
    return false;
  }

  const paddedId = String(helpReport.id).padStart(4, '0');
  const title = `Reply to your report #HR-${paddedId}`;
  const body = helpReport.response || '';
  const referenceId = helpReport.id;
  const userId = helpReport.userId;

  const existing = await Notification.findOne({
    where: {
      userId,
      type: 'support_reply',
      referenceId
    }
  });

  if (existing) {
    await existing.update({
      body,
      readAt: null
    });
    return existing;
  }

  return await Notification.create({
    userId,
    type: 'support_reply',
    title,
    body,
    referenceId,
    readAt: null
  });
}

export async function createParkingAlerts() {
  let createdCount = 0;

  try {
    const [activeSessions] = await db.query(`
      SELECT id, user_id, plate, space_id, end_time
      FROM parking_sessions
      WHERE status = 'active'
        AND user_id IS NOT NULL
        AND end_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 10 MINUTE)
    `);

    for (const session of activeSessions) {
      const formattedEndTime = new Date(session.end_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const spaceName = session.space_id || 'unassigned space';
      const title = 'Your parking ends in 10 minutes';
      const body = `Your session in ${spaceName} for ${session.plate} ends at ${formattedEndTime}. Extend it now to avoid a fine.`;

      try {
        await Notification.create({
          userId: session.user_id,
          type: 'parking_alert',
          title,
          body,
          link: '/parking/extend',
          referenceId: session.id,
          readAt: null
        });
        createdCount++;
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') {
          console.error('Error creating parking alert for session:', session.id, err);
        }
      }
    }
  } catch (error) {
    console.error('Error in createParkingAlerts:', error);
  }

  return createdCount;
}