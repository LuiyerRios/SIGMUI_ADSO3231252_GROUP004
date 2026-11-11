import { recordParkingPayment, recordExtensionPayment, PaymentError } from '../services/paymentService.js';

export const createParkingPayment = async (req, res) => {
  const userId = req.session?.user?.id;

  try {
    const result = await recordParkingPayment(userId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error in createParkingPayment:', error);
    return res.status(500).json({ error: 'The payment could not be processed. Please try again.' });
  }
};

export const createExtensionPayment = async (req, res) => {
  const userId = req.session?.user?.id;

  try {
    const result = await recordExtensionPayment(userId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error in createExtensionPayment:', error);
    return res.status(500).json({ error: 'The payment could not be processed. Please try again.' });
  }
};