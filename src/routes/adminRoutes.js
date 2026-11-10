import { Router } from 'express';
import { renderAdminHome } from '../controllers/adminHomeController.js';
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

const router = Router();

// HU-010 Admin Parking Zones
router.get('/', renderAdminHome);

router.get('/dashboard', (req, res) => res.render('HU-008', { title: 'Administrative dashboard | SIGMUI' }));  // HU-008 (se actualizará en Parte C)

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

export default router;