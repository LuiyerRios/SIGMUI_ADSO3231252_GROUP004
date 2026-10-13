import express from 'express';
import { login, logout, renderLogin } from '../controllers/authController.js';
import { handleVerifyEmail, handleResendEmail, validateResendRules } from '../controllers/verifyEmailController.js';
import { HOME_BY_ROLE } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const user = req.session?.user;
  res.redirect(user ? HOME_BY_ROLE[user.role] : '/login');
});
router.get('/login', renderLogin);
router.post('/login', login);
router.get('/logout', logout);
router.get('/signup', (req, res) => res.render('HU-002', { title: 'Sign up | SIGMUI' }));
router.get('/forgot-password', (req, res) => res.render('HU-009', { title: 'Forgot your password | SIGMUI' }));

// HU-012 Email Verification Routes
router.get('/verify-email', handleVerifyEmail);
router.post('/verify-email/resend', validateResendRules, handleResendEmail);

export default router;