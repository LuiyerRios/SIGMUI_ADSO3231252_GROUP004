/**
 * Contrato de API de Pagos Simultáneos (HU-017)
 * 
 * 1. POST /api/payments/parking
 *    - Requiere sesión de rol 'driver'
 *    - Body: { plate: string, zone: string, spaceId?: string, rateType: 'hour'|'day', quantity: number }
 *    - Respuesta 201: { id, receiptNumber, amount, startTime, endTime }
 *    - Respuestas de error: 400, 409, 500 con { error: string }
 * 
 * 2. POST /api/payments/extension
 *    - Requiere sesión de rol 'driver'
 *    - Body: { sessionId: number, hours: number }
 *    - Respuesta 201: { extensionId, receiptNumber, amount, newEndTime }
 *    - Respuestas de error: 400, 404, 409, 500 con { error: string }
 */

import express from 'express';
import { requireRole } from '../middlewares/auth.js';
import { createParkingPayment, createExtensionPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/parking', requireRole('driver'), createParkingPayment);
router.post('/extension', requireRole('driver'), createExtensionPayment);

export default router;