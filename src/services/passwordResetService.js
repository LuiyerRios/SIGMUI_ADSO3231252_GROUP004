// HU-009 · Recuperación de contraseña: token de 1 hora en user_tokens (tipo password_reset) y correo con el enlace
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import db from '../config/db.js';
import User from '../models/User.js';
import UserToken from '../models/UserToken.js';
import { sendMail } from '../config/mailer.js';
import { RESET_TOKEN_TTL_MS, RESET_LIMIT_PER_HOUR, classifyResetToken } from '../utils/passwordResetRules.js';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Devuelve 'sent' | 'not_registered' | 'too_many' | 'mail_failed'
export async function requestPasswordReset(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) return 'not_registered';

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await UserToken.count({
    where: { userId: user.id, type: 'password_reset', createdAt: { [Op.gte]: oneHourAgo } }
  });
  if (recent >= RESET_LIMIT_PER_HOUR) return 'too_many';

  // Solo el enlace más reciente sirve
  await UserToken.update({ usedAt: new Date() }, { where: { userId: user.id, type: 'password_reset', usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const token = await UserToken.create({
    userId: user.id,
    type: 'password_reset',
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #2565AE;">Reset your password</h2>
        <p>Hi ${user.fullName.replace(/[<>&"]/g, '')}, we received a request to reset the password of your Tech Parking account.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2565AE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Create a new password</a>
        </p>
        <p>This link works for 1 hour and can be used only once.</p>
        <p style="color: #888; font-size: 12px;">If you did not ask for this, you can ignore this email; your password will not change.</p>
      </div>
    </div>`;

  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your password - Tech Parking',
      html,
      text: `Create a new password with this link (valid for 1 hour): ${resetUrl}`
    });
    return 'sent';
  } catch (err) {
    console.error('Mail delivery error (HU-009):', err);
    await token.destroy(); // el enlace que no llegó se borra (y no cuenta para el límite por hora)
    return 'mail_failed';
  }
}

async function findToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/.test(rawToken)) return null;
  return UserToken.findOne({ where: { tokenHash: hashToken(rawToken), type: 'password_reset' } });
}

// Estado del enlace para pintar la página: valid | expired | invalid
export async function checkResetToken(rawToken) {
  return classifyResetToken(await findToken(rawToken));
}

// Cambia la contraseña y gasta el token en una transacción; devuelve el estado del token
export async function resetPassword(rawToken, newPassword) {
  const token = await findToken(rawToken);
  const state = classifyResetToken(token);
  if (state !== 'valid') return state;

  const hash = await bcrypt.hash(newPassword, 10);
  await db.transaction(async (transaction) => {
    const now = new Date();
    await User.update(
      { password: hash, failedAttempts: 0, lockoutUntil: null },
      { where: { id: token.userId }, transaction }
    );
    await UserToken.update(
      { usedAt: now },
      { where: { userId: token.userId, type: 'password_reset', usedAt: null }, transaction }
    );
  });
  return 'changed';
}
