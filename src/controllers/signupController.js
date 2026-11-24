import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { QueryTypes } from 'sequelize';
import db from '../config/db.js';
import User from '../models/User.js';
import { sendVerificationEmail } from '../services/emailVerificationService.js';
import { normalizePlate } from '../utils/paymentRules.js';
import { normalizeVehicleType, isValidPlateForType } from '../utils/vehicleTypes.js';

// HU-002 (#36): mensajes exactos de los criterios de aceptación
const SERVER_ERROR = 'We were unable to process your registration at this time. Please try again in a few minutes.';
const DUPLICATE_EMAIL = 'This email is already linked to an account.';
const INVALID_PLATE = 'License plate format not recognized.';
const DUPLICATE_PLATE = 'This license plate is already registered.';

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
  // El primer vehículo es obligatorio: placa válida para su tipo (las bicicletas usan número de serie)
  const vehicleType = normalizeVehicleType(req.body.vehicle_type) || 'Car';
  const plate = normalizePlate(req.body.plate);
  if (!isValidPlateForType(plate, vehicleType)) {
    return res.status(400).json({ error: INVALID_PLATE });
  }

  try {
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: DUPLICATE_EMAIL });
    }
    const [taken] = await db.query('SELECT id FROM vehicles WHERE plate = :plate LIMIT 1', {
      replacements: { plate }, type: QueryTypes.SELECT
    });
    if (taken) return res.status(409).json({ error: DUPLICATE_PLATE });

    const passwordHash = await bcrypt.hash(password, 10);
    // Usuario (rol driver) y vehículo en una sola transacción: o se guardan los dos o ninguno
    const user = await db.transaction(async (transaction) => {
      const created = await User.create({
        fullName,
        email,
        phone: phone || null,
        password: passwordHash,
        role: 'driver'
      }, { transaction });
      await db.query(
        'INSERT INTO vehicles (user_id, plate, vehicle_type) VALUES (:userId, :plate, :vehicleType)',
        { replacements: { userId: created.id, plate, vehicleType }, transaction }
      );
      return created;
    });

    // La cuenta queda creada aunque falle el correo; se puede reenviar al intentar iniciar sesión (HU-012)
    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      console.error('Signup verification email error:', mailError.message);
      return res.status(201).json({
        message: 'Registration successful, but there was a problem sending the confirmation email. Please try again later.'
      });
    }

    return res.status(201).json({ message: 'Your account was created. Check your email to verify it, then sign in.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // La placa o el correo se registraron al mismo tiempo desde otra cuenta
      const isPlate = String(error.message || '').includes('plate') || JSON.stringify(error.fields || {}).includes('plate');
      return res.status(409).json({ error: isPlate ? DUPLICATE_PLATE : DUPLICATE_EMAIL });
    }
    console.error('Signup error:', error.message);
    return res.status(503).json({ error: SERVER_ERROR });
  }
};
