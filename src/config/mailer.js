import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('Ethereal Mail account created:', testAccount.user);
  } else {
    throw new Error('SMTP credentials are not configured in production environment.');
  }

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const mailTransporter = await getTransporter();
  const mailOptions = {
    from: process.env.MAIL_FROM || '"Tech Parking" <no-reply@sigmui.com>',
    to,
    subject,
    text,
    html
  };

  const info = await mailTransporter.sendMail(mailOptions);

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}