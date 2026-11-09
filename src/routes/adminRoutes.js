import express from 'express';
import { body } from 'express-validator';
import { 
  listHelpReports, 
  renderHelpReport, 
  replyHelpReport 
} from '../controllers/helpReportAdminController.js';
import { 
  renderPaymentHistory, 
  exportPayments 
} from '../controllers/paymentHistoryController.js';
import {
  renderAdminSettings,
  updateAdminProfile,
  updateAdminPassword,
  updateAdminPreferences,
  updateAdminNotifications
} from '../controllers/adminSettingsController.js';

const router = express.Router();

router.get('/', (req, res) => res.render('HU-010', { title: 'Admin | SIGMUI' }));                          // HU-010
router.get('/dashboard', (req, res) => res.render('HU-008', { title: 'Administrative dashboard | SIGMUI' }));  // HU-008

// HU-017 Admin Payment History Routes
router.get('/payments', renderPaymentHistory);
router.get('/payments/export', exportPayments);

// HU-015 Admin Help Reports Routes
const validateReplyRules = [
  body('response')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Response must be between 5 and 1000 characters.'),
  body('status')
    .isIn(['In_Review', 'Resolved'])
    .withMessage('Invalid status selected.')
];

router.get('/help-reports', listHelpReports);
router.get('/help-reports/:id', renderHelpReport);
router.post('/help-reports/:id/reply', validateReplyRules, replyHelpReport);
// HU-018 Admin Settings Routes
router.get('/settings', renderAdminSettings);
router.put('/settings/profile', updateAdminProfile);
router.put('/settings/password', updateAdminPassword);
router.put('/settings/preferences', updateAdminPreferences);
router.put('/settings/notifications', updateAdminNotifications);

export default router;