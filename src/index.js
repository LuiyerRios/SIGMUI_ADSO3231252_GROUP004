import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';

import { exposeUser, requireRole } from './middlewares/auth.js';
import authRoutes from './routes/authRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sigmui-hu014-clave-local-2026',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    maxAge: 30 * 60 * 1000
  }
}));

app.use(exposeUser);

// Rutas
app.use('/', authRoutes);                              // HU-001, HU-002, HU-009
app.use('/api', apiRoutes);                            // APIs
app.use('/help', requireRole(), helpRoutes);           // HU-011
app.use('/agent', requireRole('agent'), agentRoutes);  // HU-006, HU-007
app.use('/admin', requireRole('admin'), adminRoutes);  // HU-010, HU-008
app.use('/', driverRoutes);                            // HU-003, HU-004, HU-005, HU-014

// 404
app.use((req, res) => {
  res.status(404).render('errors/error', {
    title: 'Not found',
    code: 404,
    message: 'The page you are looking for does not exist.'
  });
});

// Arranque sin conexión a MySQL
app.listen(PORT, () => {
  console.log(`SIGMUI running at http://localhost:${PORT}`);
});