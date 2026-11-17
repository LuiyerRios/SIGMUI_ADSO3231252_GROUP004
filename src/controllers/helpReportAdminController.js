import { validationResult } from 'express-validator';
import { Op, QueryTypes } from 'sequelize';
import db from '../config/db.js';
import HelpReport from '../models/HelpReport.js';
import { notifySupportReply } from '../services/notificationService.js';

const LIST_LOCALS = {
  title: 'Help reports | SIGMUI',
  activeMenu: 'help_reports',
  pageTitle: 'Help reports',
  pageSubtitle: 'Manage and respond to user inquiry tickets (HU-011 → HU-015)'
};

const initialsOf = (first, last) => `${String(first || '').charAt(0)}${String(last || '').charAt(0)}`.toUpperCase();

// "6 h 20 min" a partir de minutos
function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  const total = Math.round(Number(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Tarjetas y contadores de los chips (siempre sobre todos los reportes, sin filtros)
async function getReportStats() {
  const [row] = await db.query(
    `SELECT
       SUM(status = 'Pending') AS pending,
       SUM(status = 'In_Review') AS in_review,
       SUM(status = 'Resolved') AS resolved,
       SUM(status = 'Resolved' AND responded_at >= NOW() - INTERVAL 30 DAY) AS resolved_30d,
       COUNT(*) AS total,
       AVG(CASE WHEN responded_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, responded_at) END) AS avg_minutes
     FROM help_reports`,
    { type: QueryTypes.SELECT }
  );
  return {
    pending: Number(row.pending) || 0,
    inReview: Number(row.in_review) || 0,
    resolved: Number(row.resolved) || 0,
    resolved30d: Number(row.resolved_30d) || 0,
    total: Number(row.total) || 0,
    avgResponse: formatDuration(row.avg_minutes)
  };
}

// Usuario vinculado al reporte (para saber si recibirá la respuesta en su inbox)
async function getLinkedAccount(userId) {
  if (!userId) return null;
  const [user] = await db.query('SELECT role FROM users WHERE id = :id LIMIT 1', {
    replacements: { id: userId }, type: QueryTypes.SELECT
  });
  if (!user) return null;
  const roles = { driver: 'Driver', agent: 'Traffic agent', admin: 'Administrator' };
  return roles[user.role] || 'User';
}

const VALID_STATUSES = ['Pending', 'In_Review', 'Resolved', 'all'];

export const listHelpReports = async (req, res) => {
  const rawStatus = req.query.status;
  const statusFilter = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all';

  try {
    const whereClause = {};
    if (statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }

    // Búsqueda por ticket (#HR-0042 o 42), nombre o correo
    const q = String(req.query.q ?? '').trim().slice(0, 60);
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      const or = [{ firstName: like }, { lastName: like }, { email: like }];
      const ticket = q.replace(/^#?HR-?/i, '');
      if (/^\d+$/.test(ticket)) or.push({ id: Number(ticket) });
      whereClause[Op.or] = or;
    }

    const reports = await HelpReport.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    const formattedReports = reports.map(r => {
      const item = r.toJSON ? r.toJSON() : r;
      const paddedId = String(item.id).padStart(4, '0');
      return {
        ...item,
        code: `#HR-${paddedId}`,
        fullName: `${item.firstName} ${item.lastName}`,
        initials: initialsOf(item.firstName, item.lastName),
        shortDescription: item.description.length > 60 
          ? item.description.substring(0, 60) + '...' 
          : item.description,
        formattedDate: new Date(item.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      };
    });

    const stats = await getReportStats();

    res.render('HU-015-admin-list', {
      ...LIST_LOCALS,
      reports: formattedReports,
      statusFilter,
      q,
      stats,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error listing help reports:', error);
    res.status(500).render('HU-015-admin-list', {
      ...LIST_LOCALS,
      reports: [],
      statusFilter,
      q: '',
      stats: { pending: 0, inReview: 0, resolved: 0, resolved30d: 0, total: 0, avgResponse: '—' },
      errorMessage: 'Failed to load help reports. Please try again later.'
    });
  }
};

// Datos comunes de la vista de detalle (HU-015 admin)
async function detailLocals(item) {
  const paddedId = String(item.id).padStart(4, '0');
  const code = `#HR-${paddedId}`;
  return {
    title: `Report ${code} | SIGMUI`,
    activeMenu: 'help_reports',
    pageTitle: `Help report ${code}`,
    pageSubtitle: 'Read the ticket and reply to the user',
    linkedAccount: await getLinkedAccount(item.userId),
    report: {
      ...item,
      code,
      fullName: `${item.firstName} ${item.lastName}`,
      initials: initialsOf(item.firstName, item.lastName),
      formattedDate: new Date(item.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  };
}

export const renderHelpReport = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await HelpReport.findByPk(id);

    if (!report) {
      return res.status(404).render('errors/error', {
        title: 'Not found',
        code: 404,
        message: 'The requested help report does not exist.'
      });
    }

    const item = report.toJSON ? report.toJSON() : report;

    let successMessage = null;
    let infoMessage = null;
    let errorMessage = null;

    if (req.query.sent === '1') {
      successMessage = 'Reply sent successfully.';
    } else if (req.query.nouser === '1') {
      infoMessage = 'Reply saved, but this report has no linked user to notify.';
    } else if (req.query.notifyfail === '1') {
      errorMessage = 'Reply saved, but the user could not be notified.';
    }

    res.render('HU-015-admin-detail', {
      ...(await detailLocals(item)),
      formData: null,
      successMessage,
      infoMessage,
      errorMessage,
      errors: []
    });
  } catch (error) {
    console.error('Error loading help report detail:', error);
    res.status(500).render('errors/error', {
      title: 'Server Error',
      code: 500,
      message: 'Failed to retrieve the help report detail.'
    });
  }
};

export const replyHelpReport = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);

  try {
    const report = await HelpReport.findByPk(id);

    if (!report) {
      return res.status(404).render('errors/error', {
        title: 'Not found',
        code: 404,
        message: 'The requested help report does not exist.'
      });
    }

    if (!errors.isEmpty()) {
      const item = report.toJSON ? report.toJSON() : report;

      return res.status(400).render('HU-015-admin-detail', {
        ...(await detailLocals(item)),
        formData: {
          response: req.body.response,
          status: req.body.status
        },
        errors: errors.array(),
        successMessage: null,
        infoMessage: null,
        errorMessage: null
      });
    }

    const { response, status } = req.body;

    await report.update({
      response,
      status,
      respondedAt: new Date()
    });

    try {
      const notificationCreated = await notifySupportReply(report);
      if (!notificationCreated) {
        return res.redirect(`/admin/help-reports/${id}?nouser=1`);
      }
      return res.redirect(`/admin/help-reports/${id}?sent=1`);
    } catch (notifErr) {
      console.error('Error notifying user of support reply:', notifErr);
      return res.redirect(`/admin/help-reports/${id}?notifyfail=1`);
    }

  } catch (error) {
    console.error('Error replying to help report:', error);
    res.status(500).render('errors/error', {
      title: 'Server Error',
      code: 500,
      message: 'Failed to send reply to the report.'
    });
  }
};