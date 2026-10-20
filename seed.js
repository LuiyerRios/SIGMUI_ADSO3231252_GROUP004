import bcrypt from 'bcryptjs';
import db from './src/config/db.js';
import User from './src/models/User.js';

const demoUsers = [
  { fullName: 'Admin SIGMUI', email: 'admin@sigmui.com', role: 'admin', password: 'Admin12345' },
  { fullName: 'Transit Agent', email: 'agent@sigmui.com', role: 'agent', password: 'Agent12345' },
  { fullName: 'Demo Driver', email: 'driver@sigmui.com', role: 'driver', password: 'Driver12345', plate: 'ABC123' }
];

try {
  await db.authenticate();
  for (const u of demoUsers) {
    const password = await bcrypt.hash(u.password, 10);
    const [user, created] = await User.findOrCreate({
      where: { email: u.email },
      defaults: {
        fullName: u.fullName,
        role: u.role,
        password,
        emailVerifiedAt: new Date()
      }
    });
    if (u.plate) {
      await db.query('INSERT IGNORE INTO vehicles (user_id, plate) VALUES (?, ?)', { replacements: [user.id, u.plate] });
    }
    console.log(created
      ? `CREATED ${u.role.padEnd(6)} ${u.email} / ${u.password}`
      : `EXISTS  ${u.role.padEnd(6)} ${u.email} (password unchanged)`);
  }
} catch (error) {
  console.error('Seed error:', error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}