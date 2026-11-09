import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import User from '../models/User.js';

// Mostrar página de configuración
export const renderAdminSettings = async (req, res) => {
  try {
    const admin = await User.findByPk(req.session.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!admin) {
      return res.status(404).render('errors/error', {
        title: 'Administrator not found',
        code: 404,
        message: 'The administrator account could not be found.'
      });
    }

    res.render('HU-018', {
      title: 'Settings | SIGMUI',
      admin,
      active: 'settings'
    });
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).send('Unable to load administrator settings.');
  }
};

// Actualizar información del perfil
export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await User.findByPk(req.session.user.id);

    if (!admin) {
      return res.status(404).json({
        error: 'Administrator account not found.'
      });
    }

    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const primaryAddress = String(req.body.primaryAddress || '').trim();

    if (!fullName || fullName.length > 100) {
      return res.status(400).json({
        error: 'Enter a valid full name.'
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email) || email.length > 255) {
      return res.status(400).json({
        error: 'Enter a valid email address.'
      });
    }

    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      return res.status(400).json({
        error: 'Enter a valid phone number.'
      });
    }

    if (primaryAddress.length > 255) {
      return res.status(400).json({
        error: 'The address is too long.'
      });
    }

    const existingEmail = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: admin.id }
      }
    });

    if (existingEmail) {
      return res.status(409).json({
        error: 'This email address is already in use.'
      });
    }

    await admin.update({
      fullName,
      email,
      phone: phone || null,
      primaryAddress: primaryAddress || null
    });

    req.session.user.name = admin.fullName;
    req.session.user.email = admin.email;

    res.json({
      message: 'Profile information updated successfully.'
    });

  } catch (error) {
    console.error('Profile update error:', error);

    res.status(500).json({
      error: 'Unable to update profile information. Please try again.'
    });
  }
};

// Actualizar contraseña
export const updateAdminPassword = async (req, res) => {
  try {
    const admin = await User.findByPk(req.session.user.id);

    if (!admin) {
      return res.status(404).json({
        error: 'Administrator account not found.'
      });
    }

    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'All password fields are required.'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'The current password is incorrect.'
      });
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({
        error: 'The new password does not meet the security requirements.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'The new passwords do not match.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await admin.update({
      password: hashedPassword
    });

    res.json({
      message: 'Password updated successfully.'
    });

  } catch (error) {
    console.error('Password update error:', error);

    res.status(500).json({
      error: 'Unable to update password. Please try again.'
    });
  }
};

// Actualizar preferencias administrativas
export const updateAdminPreferences = async (req, res) => {
  try {
    const language = req.body.preferredLanguage;
    const theme = req.body.preferredTheme;

    if (!['en', 'es'].includes(language)) {
      return res.status(400).json({
        error: 'Invalid language selected.'
      });
    }

    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({
        error: 'Invalid theme selected.'
      });
    }

    const admin = await User.findByPk(req.session.user.id);

    if (!admin) {
      return res.status(404).json({
        error: 'Administrator account not found.'
      });
    }

    await admin.update({
      preferredLanguage: language,
      preferredTheme: theme
    });

    res.json({
      message: 'Preferences updated successfully.'
    });

  } catch (error) {
    console.error('Preferences update error:', error);

    res.status(500).json({
      error: 'Unable to update preferences. Please try again.'
    });
  }
};

// Actualizar preferencias de notificaciones
export const updateAdminNotifications = async (req, res) => {
  try {
    const { notifyAccountActivity, notifySystemEvents } = req.body;

    if (
      typeof notifyAccountActivity !== 'boolean' ||
      typeof notifySystemEvents !== 'boolean'
    ) {
      return res.status(400).json({
        error: 'Invalid notification preferences.'
      });
    }

    const admin = await User.findByPk(req.session.user.id);

    if (!admin) {
      return res.status(404).json({
        error: 'Administrator account not found.'
      });
    }

    await admin.update({
      notifyAccountActivity,
      notifySystemEvents
    });

    res.json({
      message: 'Notification preferences updated successfully.'
    });

  } catch (error) {
    console.error('Notifications update error:', error);

    res.status(500).json({
      error: 'Unable to update notification preferences. Please try again.'
    });
  }
};