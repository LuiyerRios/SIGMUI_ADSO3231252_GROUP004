import db from '../src/config/db.js';
import User from '../src/models/User.js';
import { sendVerificationEmail } from '../src/services/emailVerificationService.js';

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('Error: Please provide a target email address.');
  console.log('Usage: node scripts/send-verification.js user@example.com');
  process.exit(1);
}

try {
  await db.authenticate();

  const user = await User.findOne({ where: { email: targetEmail.trim().toLowerCase() } });

  if (!user) {
    console.error(`User with email "${targetEmail}" was not found.`);
    process.exit(1);
  }

  await user.update({ emailVerifiedAt: null });
  console.log(`User ${user.email} marked as unverified (email_verified_at = NULL).`);

  await sendVerificationEmail(user);
  console.log(`Verification email successfully sent to ${user.email}.`);
} catch (error) {
  console.error('Error sending verification email:', error.message || error);
  process.exitCode = 1;
} finally {
  await db.close();
}