import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { sendVerificationEmail } from '../services/emailVerificationService.js';

const SERVER_ERROR = 'Error connecting to the server. Please try again later.';
const DUPLICATE_EMAIL = 'An account with this email already exists.';

// HU-002: los mismos requisitos de contraseña que muestra la vista (el símbolo es opcional)
export const validateSignupRules = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ max: 100 })
    .withMessage('Full name must be 100 characters or less.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 255 })
    .withMessage('Email address must be 255 characters or less.')
    .toLowerCase(),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be 20 characters or less.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must have at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must include a number.'),
  body('confirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match.'),
  body('terms')
    .equals('true')
    .withMessage('You must accept the terms and the data policy.')
];

export const handleSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { full_name: fullName, email, phone, password } = req.body;

  try {
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: DUPLICATE_EMAIL });
    }

    const user = await User.create({
      fullName,
      email,
      phone: phone || null,
      password: await bcrypt.hash(password, 10),
      role: 'driver'
    });

    // La cuenta queda creada aunque falle el correo; se puede reenviar al intentar iniciar sesión (HU-012)
    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      console.error('Signup verification email error:', mailError.message);
      return res.status(201).json({
        message: 'Your account was created, but we could not send the verification email. Sign in to request a new one.'
      });
    }

    return res.status(201).json({ message: 'Your account was created. Check your email to verify it, then sign in.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: DUPLICATE_EMAIL });
    }
    console.error('Signup error:', error.message);
    return res.status(503).json({ error: SERVER_ERROR });
  }
};
