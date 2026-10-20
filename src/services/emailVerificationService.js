import crypto from 'crypto';
import { Op } from 'sequelize';
import db from '../config/db.js';
import User from '../models/User.js';
import UserToken from '../models/UserToken.js';
import { sendMail } from '../config/mailer.js';

const RESEND_LIMIT_PER_HOUR = 3;

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function sendVerificationEmail(user) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await UserToken.count({
    where: {
      userId: user.id,
      type: 'email_verification',
      createdAt: { [Op.gte]: oneHourAgo }
    }
  });

  if (recentCount >= RESEND_LIMIT_PER_HOUR) {
    const error = new Error('Too many requests. Please try again in one hour.');
    error.code = 'TOO_MANY_REQUESTS';
    throw error;
  }

  await UserToken.update(
    { usedAt: new Date() },
    {
      where: {
        userId: user.id,
        type: 'email_verification',
        usedAt: null
      }
    }
  );

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await UserToken.create({
    userId: user.id,
    type: 'email_verification',
    tokenHash,
    expiresAt
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #2565AE;">Verify your email address</h2>
        <p>Thank you for registering with Tech Parking. Please confirm your email address by clicking the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2565AE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p style="color: #888; font-size: 12px;">If you did not create an account, you can ignore this email.</p>
      </div>
    </div>
  `;

  try {
    await sendMail({
      to: user.email,
      subject: 'Verify your email address - Tech Parking',
      html: htmlContent,
      text: `Please verify your email address by opening the following link: ${verificationUrl}`
    });
  } catch (err) {
    console.error('Mail delivery error:', err);
    const error = new Error('We could not send the verification email. Please try again later.');
    error.code = 'MAIL_FAILURE';
    throw error;
  }
}

export async function verifyToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return 'invalid';
  }

  const tokenHash = hashToken(rawToken);

  const tokenRecord = await UserToken.findOne({
    where: {
      tokenHash,
      type: 'email_verification'
    }
  });

 if (!tokenRecord) {
    return 'invalid';
  }

  const user = await User.findByPk(tokenRecord.userId);
  if (!user) {
    return 'invalid';
  }

  if (user.emailVerifiedAt) {
    return 'already_verified';
  }

  // Usado sin que el correo esté verificado = un enlace reemplazado por uno más nuevo
  if (tokenRecord.usedAt) {
    return 'invalid';
  }

  if (tokenRecord.expiresAt < new Date()) {
    return 'expired';
  }
  
  const t = await db.transaction();
  try {
    const now = new Date();
    await tokenRecord.update({ usedAt: now }, { transaction: t });
    await user.update({ emailVerifiedAt: now }, { transaction: t });
    await t.commit();
    return 'verified';
  } catch (err) {
    await t.rollback();
    console.error('Database transaction error during verification:', err);
    throw new Error('We were unable to verify your email at this time. Please try again in a few minutes.');
  }
}