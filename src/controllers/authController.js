import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { HOME_BY_ROLE } from '../middlewares/auth.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = 'Invalid credentials or user does not exist.';

export const renderLogin = (req, res) => {
  res.render('HU-001', {
    title: 'Sign in | SIGMUI',
    error: req.query.expired ? 'Your session has expired. Please log in again.' : null
  });
};

export const login = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const fail = (error, status = 401, extraParams = {}) => 
    res.status(status).render('HU-001', { title: 'Sign in | SIGMUI', error, email, ...extraParams });

  if (!email || !password) return fail(GENERIC_ERROR, 400);

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return fail(GENERIC_ERROR);

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return fail(`Your account is locked for ${LOCK_MINUTES} minutes due to too many failed attempts.`, 423);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const attempts = user.failedAttempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await user.update({ failedAttempts: 0, lockoutUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) });
        return fail(`Your account is locked for ${LOCK_MINUTES} minutes due to too many failed attempts.`, 423);
      }
      await user.update({ failedAttempts: attempts });
      return fail(GENERIC_ERROR);
    }

    // Verificación de email obligatorio antes de crear la sesión (HU-012)
    if (!user.emailVerifiedAt) {
      return fail('Please verify your email before signing in.', 403, {
        showResend: true,
        unverifiedEmail: user.email
      });
    }

    await user.update({ failedAttempts: 0, lockoutUntil: null });

    req.session.regenerate((err) => {
      if (err) return fail('Error connecting to the security server. Please try again later.', 503);
      req.session.user = { id: user.id, name: user.fullName, email: user.email, role: user.role };
      req.session.save(() => res.redirect(HOME_BY_ROLE[user.role] || '/login'));
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return fail('Error connecting to the security server. Please try again later.', 503);
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};