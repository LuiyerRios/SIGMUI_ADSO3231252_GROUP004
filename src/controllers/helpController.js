import { validationResult } from 'express-validator';
import HelpReport from '../models/HelpReport.js';
import User from '../models/User.js';

// Locals del layout compartido (sidebar + topbar)
const layoutLocals = {
  title: 'Help & Support - SIGMUI',
  activeMenu: 'help',
  pageTitle: 'Help & Support',
  pageSubtitle: 'Tell us about a problem or send us a suggestion'
};

// Prellena el formulario con los datos del usuario de la sesión
const getPrefill = async (sessionUser) => {
  const user = await User.findByPk(sessionUser.id, { attributes: ['fullName', 'email', 'phone'] });
  const parts = String(user?.fullName || sessionUser.name || '').trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    email: user?.email || sessionUser.email || '',
    phone: user?.phone || '',
    description: ''
  };
};

// GET: Renderiza la vista del formulario
export const renderHelpPage = async (req, res) => {
  try {
    res.render('HU-011', {
      ...layoutLocals,
      errors: [],
      formData: await getPrefill(req.session.user)
    });
  } catch (error) {
    console.error('Help page error:', error);
    res.status(500).send('The Help page is temporarily unavailable.');
  }
};

// POST: Recibe y guarda el reporte
export const createHelpReport = async (req, res) => {
  const errors = validationResult(req);
  const formData = req.body;

  if (!errors.isEmpty()) {
    return res.status(400).render('HU-011', {
      ...layoutLocals,
      errors: errors.array(),
      formData
    });
  }

  try {
    await HelpReport.create({
      userId: req.session.user.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      description: formData.description
    });

    res.render('HU-011', {
      ...layoutLocals,
      successMessage: 'Your report was sent successfully!',
      errors: [],
      formData: await getPrefill(req.session.user)
    });
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    res.status(500).render('HU-011', {
      ...layoutLocals,
      errorMessage: 'Failed to submit report due to a server error. Please try again later.',
      errors: [],
      formData
    });
  }
};
