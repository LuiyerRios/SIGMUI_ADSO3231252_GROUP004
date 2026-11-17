import express from 'express';
import { login, logout, renderLogin } from '../controllers/authController.js';
import { handleVerifyEmail, handleResendEmail, validateResendRules } from '../controllers/verifyEmailController.js';
import { handleSignup, validateSignupRules } from '../controllers/signupController.js';
import { HOME_BY_ROLE } from '../middlewares/auth.js';
import {
  renderForgotPassword, handleForgotPassword, renderResetPassword, handleResetPassword
} from '../controllers/passwordResetController.js';

const router = express.Router();

router.get('/', (req, res) => {
  const user = req.session?.user;
  res.redirect(user ? HOME_BY_ROLE[user.role] : '/home');
});
// HU-000 Home / landing page pública (tarifa y tiempo máximo de demo); con sesión, va al panel de su rol
router.get('/home', (req, res) => {
  const user = req.session?.user;
  if (user) return res.redirect(HOME_BY_ROLE[user.role]);
  res.render('HU-000', { title: 'Tech Parking | SIGMUI', rate: 2000, maxStay: '24 h' });
});
router.get('/login', renderLogin);
router.post('/login', login);
router.get('/logout', logout);
router.get('/signup', (req, res) => res.render('HU-002', { title: 'Sign up | SIGMUI' }));
router.post('/signup', validateSignupRules, handleSignup);
// HU-009 Forgot your password
router.get('/forgot-password', renderForgotPassword);
router.post('/forgot-password', handleForgotPassword);
router.get('/reset-password', renderResetPassword);
router.post('/reset-password', handleResetPassword);

// HU-012 Email Verification Routes
router.get('/verify-email', handleVerifyEmail);
router.post('/verify-email/resend', validateResendRules, handleResendEmail);

export default router;