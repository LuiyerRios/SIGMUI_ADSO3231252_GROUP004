import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Importaciones de rutas de los módulos
import adminRoutes from './routes/adminRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';

const app = express();

// Configuración de rutas absolutas (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuración del motor de plantillas (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 2. Archivos estáticos (apunta a la carpeta /public de la raíz)
app.use(express.static(path.join(__dirname, '../public')));

// 3. Middlewares para procesar datos de formularios y JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Registro de rutas modulares
app.use('/', adminRoutes);
app.use('/help', helpRoutes);
app.use('/zones', zoneRoutes);

// 5. Rutas directas para vistas específicas
app.get('/', (req, res) => {
  res.render('HU-001', { title: 'Inicio - SIGMUI' });
});

// Rutas integradas desde index3.js
app.get('/hu-007', (req, res) => {
  res.render('HU-007', {
    title: 'Multas - SIGMUI',
    multa: {
      estado: "",
      descripcionEstado: "",
      fecha: "",
      ubicacion: "",
      tiempoExcedido: "",
      ubicacionActual: "",
      comentarios: "",
      valor: "",
      numeroMulta: "",
      vehiculo: { placa: "" }
    }
  });
});

app.get('/hu-008', (req, res) => {
  res.render('HU-008', {
    title: 'Historial - SIGMUI',
    fecha: "",
    mensaje: ""
  });
});

export default app;