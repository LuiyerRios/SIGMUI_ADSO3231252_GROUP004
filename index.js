import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './src/config/database.js';
import { login } from './src/controllers/authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para procesar datos de formularios y sesiones
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'sigmui_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 30 } // Sesión activa por 30 minutos
}));

// Motor de plantilla y estáticos
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'src/views'));
app.use(express.static(path.join(__dirname, 'src/public')));

// Rutas
app.get('/', (req, res) => res.render('HU-001'));
app.post('/login', login);

// Sincronizar Base de Datos e Iniciar Servidor
sequelize.sync().then(() => {
  console.log('Database connected & models synchronized.');
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});