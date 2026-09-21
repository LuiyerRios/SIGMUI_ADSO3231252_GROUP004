import express from 'express';
import db from './config/db.js';
import helpRoutes from './routes/helpRoutes.js';

const app = express();

// Conectar y sincronizar la Base de Datos
try {
  await db.authenticate();
  await db.sync(); // Esto crea las tablas vacías automáticamente
  console.log('Conexión a la base de datos establecida correctamente.');
} catch (error) {
  console.error('Error al conectar con la base de datos:', error);
}

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('src/public'));

// Motor de plantilla Pug
app.set('view engine', 'pug');
app.set('views', './src/views');

// Rutas
app.use('/', helpRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});