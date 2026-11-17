// HU-009 · Olvidé mi contraseña: solicitar el enlace y crear la contraseña nueva
import { validateResetEmail, validateNewPassword, RESET_MESSAGES } from '../utils/passwordResetRules.js';
import { requestPasswordReset, checkResetToken, resetPassword } from '../services/passwordResetService.js';

// GET /forgot-password
export const renderForgotPassword = (req, res) => {
  res.render('HU-009', { title: 'Forgot your password | SIGMUI', expired: req.query.expired === '1' });
};

// POST /forgot-password  (JSON desde public/js/HU-009.js)
export const handleForgotPassword = async (req, res) => {
  const { value: email, error } = validateResetEmail(req.body?.email);
  if (error) return res.status(400).json({ error });

  try {
    const result = await requestPasswordReset(email);
    if (result === 'not_registered') return res.status(404).json({ error: RESET_MESSAGES.notRegistered });
    if (result === 'too_many') return res.status(429).json({ error: RESET_MESSAGES.tooMany });
    if (result === 'mail_failed') return res.status(502).json({ error: RESET_MESSAGES.mailFailed, retry: true });
    res.json({ message: RESET_MESSAGES.sent });
  } catch (err) {
    console.error('Error requesting password reset (HU-009):', err);
    res.status(500).json({ error: RESET_MESSAGES.mailFailed, retry: true });
  }
};

const resetLocals = (extra) => ({ title: 'Create a new password | SIGMUI', state: 'valid', token: '', error: null, ...extra });

// GET /reset-password?token=...
export const renderResetPassword = async (req, res) => {
  const token = String(req.query.token || '');
  try {
    const state = await checkResetToken(token);
    res.status(state === 'valid' ? 200 : 410).render('HU-009-reset', resetLocals({ state, token }));
  } catch (err) {
    console.error('Error checking reset token (HU-009):', err);
    res.status(500).render('HU-009-reset', resetLocals({ state: 'error', error: 'We could not open the recovery link. Please try again.' }));
  }
};

// POST /reset-password
export const handleResetPassword = async (req, res) => {
  const token = String(req.body?.token || '');
  const { value: password, error } = validateNewPassword(req.body);
  if (error) return res.status(400).render('HU-009-reset', resetLocals({ token, error }));

  try {
    const result = await resetPassword(token, password);
    if (result === 'changed') return res.render('HU-009-reset', resetLocals({ state: 'changed' }));
    res.status(410).render('HU-009-reset', resetLocals({ state: result }));
  } catch (err) {
    console.error('Error resetting password (HU-009):', err);
    res.status(500).render('HU-009-reset', resetLocals({ token, error: 'Your password could not be changed. Please try again.' }));
  }
};
