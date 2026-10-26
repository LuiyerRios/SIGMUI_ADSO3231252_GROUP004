import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { verifyToken, sendVerificationEmail } from '../services/emailVerificationService.js';

export const handleVerifyEmail = async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status: 'invalid',
      message: 'Invalid verification link.'
    });
  }

  try {
    const result = await verifyToken(token);

    let message = '';
    let status = result;

    switch (result) {
      case 'verified':
        message = 'Your email has been verified. You can now sign in.';
        break;
      case 'already_verified':
        message = 'This email has already been verified. You can sign in.';
        break;
      case 'expired':
        message = 'This verification link has expired.';
        break;
      case 'invalid':
      default:
        status = 'invalid';
        message = 'Invalid verification link.';
        break;
    }

    return res.render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status,
      message
    });
  } catch (error) {
    console.error('Error during email verification:', error);
    return res.status(500).render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status: 'error',
      message: 'We were unable to verify your email at this time. Please try again in a few minutes.'
    });
  }
};

export const validateResendRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .toLowerCase()
];

export const handleResendEmail = async (req, res) => {
  const errors = validationResult(req);
  const genericSuccessMessage = 'If an account exists with that email address, a new verification link has been sent.';

  if (!errors.isEmpty()) {
    return res.status(400).render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status: 'error',
      message: errors.array()[0].msg,
      showResendForm: true
    });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    // Si el usuario no existe o ya está verificado, responde con el mensaje genérico (sin revelar cuentas)
    if (!user || user.emailVerifiedAt) {
      return res.render('HU-012', {
        title: 'Email Verification | SIGMUI',
        status: 'info',
        message: genericSuccessMessage
      });
    }

    await sendVerificationEmail(user);

    return res.render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status: 'info',
      message: genericSuccessMessage
    });
  } catch (error) {
    console.error('Error in handleResendEmail:', error);

    let displayMessage = 'We could not send the verification email. Please try again later.';

    if (error.code === 'TOO_MANY_REQUESTS') {
      displayMessage = 'Too many requests. Please try again in one hour.';
    } else if (error.code === 'MAIL_FAILURE') {
      displayMessage = 'We could not send the verification email. Please try again later.';
    }

    return res.status(error.code === 'TOO_MANY_REQUESTS' ? 429 : 503).render('HU-012', {
      title: 'Email Verification | SIGMUI',
      status: 'error',
      message: displayMessage,
      showResendForm: true,
      resendEmail: email
    });
  }
};