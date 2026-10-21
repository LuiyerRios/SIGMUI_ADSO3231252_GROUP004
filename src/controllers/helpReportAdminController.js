import { validationResult } from 'express-validator';
import HelpReport from '../models/HelpReport.js';
import { notifySupportReply } from '../services/notificationService.js';

const VALID_STATUSES = ['Pending', 'In_Review', 'Resolved', 'all'];

export const listHelpReports = async (req, res) => {
  const rawStatus = req.query.status;
  const statusFilter = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all';

  try {
    const whereClause = {};
    if (statusFilter !== 'all') {
      whereClause.status = statusFilter;
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

    res.render('HU-015-admin-list', {
      title: 'Help Reports Administration | SIGMUI',
      reports: formattedReports,
      statusFilter,
      errorMessage: null
    });
  } catch (error) {
    console.error('Error listing help reports:', error);
    res.status(500).render('HU-015-admin-list', {
      title: 'Help Reports Administration | SIGMUI',
      reports: [],
      statusFilter,
      errorMessage: 'Failed to load help reports. Please try again later.'
    });
  }
};

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
    const paddedId = String(item.id).padStart(4, '0');

    const formattedReport = {
      ...item,
      code: `#HR-${paddedId}`,
      formattedDate: new Date(item.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    res.render('HU-015-admin-detail', {
      title: `Report ${formattedReport.code} | SIGMUI`,
      report: formattedReport,
      successMessage: req.query.success || null,
      infoMessage: req.query.info || null,
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
      const paddedId = String(item.id).padStart(4, '0');

      return res.status(400).render('HU-015-admin-detail', {
        title: `Report #HR-${paddedId} | SIGMUI`,
        report: {
          ...item,
          code: `#HR-${paddedId}`,
          formattedDate: new Date(item.createdAt).toLocaleString('en-US')
        },
        errors: errors.array(),
        successMessage: null,
        infoMessage: null
      });
    }

    const { response, status } = req.body;

    await report.update({
      response,
      status,
      respondedAt: new Date()
    });

    const notificationCreated = await notifySupportReply(report);

    if (!notificationCreated) {
      return res.redirect(`/admin/help-reports/${id}?info=Reply saved, but this report has no linked user to notify.`);
    }

    return res.redirect(`/admin/help-reports/${id}?success=Reply sent successfully.`);
  } catch (error) {
    console.error('Error replying to help report:', error);
    res.status(500).render('errors/error', {
      title: 'Server Error',
      code: 500,
      message: 'Failed to send reply to the report.'
    });
  }
};