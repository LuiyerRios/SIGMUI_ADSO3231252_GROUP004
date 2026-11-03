import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';

import db from './config/db.js';
import { exposeUser, requireRole } from './middlewares/auth.js';
import { exposeUnreadCount } from './middlewares/notifications.js';
import { createParkingAlerts } from './services/notificationService.js';
import authRoutes from './routes/authRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos: SOLO la carpeta public/ de la raíz
app.use(express.static(path.join(__dirname, '../public')));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // HU-001: la sesión se mantiene mientras haya uso continuo
  cookie: { httpOnly: true, maxAge: 30 * 60 * 1000 } // expira tras 30 min sin actividad
}));
app.use(exposeUser);
app.use(exposeUnreadCount);

// Rutas
app.use('/', authRoutes);                              // HU-001, HU-002, HU-009
app.use('/api', apiRoutes);                            // APIs (protegidas adentro)
app.use('/help', requireRole(), helpRoutes);           // HU-011
app.use('/inbox', requireRole(), inboxRoutes);         // HU-015
app.use('/agent', requireRole('agent'), agentRoutes);  // HU-006, HU-007
app.use('/admin', requireRole('admin'), adminRoutes);  // HU-010, HU-008
app.use('/', driverRoutes);                            // HU-003, HU-004, HU-005

// 404
app.use((req, res) => {
  res.status(404).render('errors/error', { title: 'Not found', code: 404, message: 'The page you are looking for does not exist.' });
});

// Arranque: primero verifica MySQL
try {
  await db.authenticate();
  app.listen(PORT, () => {
    console.log(`SIGMUI running at http://localhost:${PORT}`);

    // Bucle en segundo plano para alertas de 10 min
    if (process.env.NODE_ENV !== 'test') {
      setInterval(async () => {
        try {
          await createParkingAlerts();
        } catch (err) {
          console.error('Background alert runner error:', err.message);
        }
      }, 60000);
    }
  });
} catch (error) {
  console.error('Cannot connect to MySQL. Check your .env file:', error.message);
  process.exit(1);
}