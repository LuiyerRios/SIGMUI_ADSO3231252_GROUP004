import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Conexión a BD y Rutas Modulares (es obligatorio incluir la extensión .js)
import db from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para simular __dirname en Módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuración del motor de plantillas (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 2. Archivos estáticos (public en la raíz y en src)
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// 3. Middlewares para procesar solicitudes JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================================================
// 4. INICIO DE SESIÓN (HU-001 / HU-002) - RUTA PRINCIPAL
// =========================================================================

// Entrada principal (localhost:3000/)
app.get('/', (req, res) => {
  res.render('HU-001', { 
    title: 'Iniciar Sesión - SIGMUI',
    error: null 
  });
});

app.get('/login', (req, res) => {
  res.render('HU-001', { 
    title: 'Iniciar Sesión - SIGMUI',
    error: null 
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // TODO: Validar credenciales con la base de datos (models/User)
  res.redirect('/zones');
});

app.get('/signup', (req, res) => {
  res.render('HU-002', { 
    title: 'Registro - SIGMUI',
    error: null 
  });
});

// =========================================================================
// 5. RUTAS DE MÓDULOS Y DEMÁS HISTORIAS DE USUARIO
// =========================================================================

app.use('/admin', adminRoutes);
app.use('/help', helpRoutes);
app.use('/zones', zoneRoutes);

// HU-005: Guardar reserva
app.post('/reservas', (req, res) => {
  const { plate, location, time, status, total } = req.body;
  const sql = `
    INSERT INTO reservations (plate, location, time, status, total)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [plate, location, time, status, total], (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error guardando reserva' });
    }
    res.json({ message: 'Reserva guardada con éxito' });
  });
});

// HU-005: Obtener reservas
app.get('/reservas', (req, res) => {
  const sql = 'SELECT * FROM reservations';
  db.query(sql, (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json(error);
    }
    res.json(result);
  });
});

// HU-007: Multas
app.get('/hu-007', (req, res) => {
  res.render('HU-007', {
    title: 'Multas - SIGMUI',
    multa: {
      estado: '',
      descripcionEstado: '',
      fecha: '',
      ubicacion: '',
      tiempoExcedido: '',
      ubicacionActual: '',
      comentarios: '',
      valor: '',
      numeroMulta: '',
      vehiculo: { placa: '' }
    }
  });
});

// HU-008: Historial
app.get('/hu-008', (req, res) => {
  res.render('HU-008', {
    title: 'Historial - SIGMUI',
    fecha: '',
    mensaje: ''
  });
});

// =========================================================================
// 6. ARRANQUE DEL SERVIDOR
// =========================================================================
app.listen(PORT, () => {
  console.log(`Servidor funcionando correctamente en http://localhost:${PORT}`);
});