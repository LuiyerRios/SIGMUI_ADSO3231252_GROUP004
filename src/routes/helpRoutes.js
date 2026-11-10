import express from 'express';
import { body } from 'express-validator';
import { renderHelpPage, createHelpReport } from '../controllers/helpController.js';

const router = express.Router();

// Responde en GET http://localhost:3000/help
router.get('/', renderHelpPage);

// Responde en POST http://localhost:3000/help
router.post(
  '/',
  [
    body('firstName').trim().notEmpty().withMessage('First Name is required.'),
    body('lastName').trim().notEmpty().withMessage('Last Name is required.'),
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('phone').trim().notEmpty().withMessage('Phone number is required.'),
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required.')
      .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters.')
  ],
  createHelpReport
);

export default router;