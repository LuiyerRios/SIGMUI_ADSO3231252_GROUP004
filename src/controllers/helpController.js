import { validationResult } from 'express-validator';
import HelpReport from '../models/HelpReport.js';

// GET: Renderiza la vista del formulario
export const renderHelpPage = (req, res) => {
  try {
    res.render('help', { 
      title: 'Help & Support - SIGMUI',
      errors: [],
      formData: {} 
    });
  } catch (error) {
    res.status(500).send('The Help page is temporarily unavailable.');
  }
};

// POST: Recibe y guarda el reporte
export const createHelpReport = async (req, res) => {
  const errors = validationResult(req);
  const formData = req.body;

  if (!errors.isEmpty()) {
    return res.status(400).render('help', {
      title: 'Help & Support - SIGMUI',
      errors: errors.array(),
      formData
    });
  }

  try {
    await HelpReport.create({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      description: formData.description
    });

    res.render('help', {
      title: 'Help & Support - SIGMUI',
      successMessage: 'Your report was sent successfully!',
      errors: [],
      formData: {}
    });
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    res.status(500).render('help', {
      title: 'Help & Support - SIGMUI',
      errorMessage: 'Failed to submit report due to a server error. Please try again later.',
      errors: [],
      formData
    });
  }
};