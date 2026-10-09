import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// DB Connection and Modular Routes (.js extension required)
import db from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';
import { login } from './controllers/authController.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Config to simulate __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Template Engine Setup (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 2. Static Files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// 3. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'sigmui_secret_key',
  resave: false,
  saveUninitialized: false
}));

// =========================================================================
// 4. AUTHENTICATION ROUTES (HU-001 / HU-002)
// =========================================================================

app.get('/', (req, res) => {
  res.render('HU-001', { 
    title: 'Login - SIGMUI',
    error: null 
  });
});

app.get('/login', (req, res) => {
  res.render('HU-001', { 
    title: 'Login - SIGMUI',
    error: null 
  });
});

app.post('/login', login);

app.get('/signup', (req, res) => {
  res.render('HU-002', { 
    title: 'Sign Up - SIGMUI',
    error: null 
  });
});

// LOGOUT
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).send('Error logging out');
      }
      res.clearCookie('connect.sid');
      return res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

// =========================================================================
// 5. PARKING API ROUTES (HU-010 & HU-008)
// =========================================================================

// 1. Get all parking spaces with user and vehicle info
app.get('/api/parking-spaces', async (req, res) => {
  const sql = `
    SELECT 
      p.id, 
      p.zone, 
      p.status, 
      p.description,
      p.vehicle_id,
      COALESCE(v.plate, '---') AS vehicle,
      COALESCE(u.name, '---') AS owner,
      DATE_FORMAT(p.entry_time, '%h:%i %p') AS entry
    FROM parking_spaces p
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY p.zone ASC, CAST(SUBSTRING(p.id, 2) AS UNSIGNED) ASC
  `;

  try {
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: 'Database query error' });
  }
});

// 2. Get current parking configuration
app.get('/api/parking-config', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM parking_config WHERE id = 1');
    if (!results || results.length === 0) {
      return res.json({ spaces_per_zone: 10, zones_list: 'A,B,C,D' });
    }
    res.json(results[0]);
  } catch (error) {
    res.json({ spaces_per_zone: 10, zones_list: 'A,B,C,D' });
  }
});

// 3. Reconfigure parking layout & capacity
app.post('/api/parking-config', async (req, res) => {
  try {
    const { spacesPerZone, zones } = req.body;
    const zonesStr = Array.isArray(zones) ? zones.join(',') : zones;

    const updateConfigSql = `
      INSERT INTO parking_config (id, spaces_per_zone, zones_list) 
      VALUES (1, :spacesPerZone, :zonesStr) 
      ON DUPLICATE KEY UPDATE 
        spaces_per_zone = :spacesPerZone, 
        zones_list = :zonesStr
    `;

    await db.query(updateConfigSql, {
      replacements: { spacesPerZone, zonesStr }
    });

    await db.query('TRUNCATE TABLE parking_spaces');

    const zonesList = Array.isArray(zones) ? zones : zones.split(',');
    const newSpaces = [];

    zonesList.forEach(zone => {
      for (let num = 1; num <= spacesPerZone; num++) {
        const spaceId = `${zone.trim()}${num}`;
        const zoneName = zone.trim();
        newSpaces.push(`('${spaceId}', '${zoneName}', 'available', 'Space available')`);
      }
    });

    if (newSpaces.length > 0) {
      const insertSql = `
        INSERT INTO parking_spaces (id, zone, status, description) 
        VALUES ${newSpaces.join(', ')}
      `;
      await db.query(insertSql);
    }

    res.json({ message: 'Parking capacity and layout successfully reconfigured.' });

  } catch (error) {
    console.error("Error updating parking config:", error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// 4. Update individual parking space status (NUEVO / CORREGIDO)
app.put('/api/parking-spaces/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description } = req.body;

    const updateSql = `
      UPDATE parking_spaces 
      SET 
        status = COALESCE(:status, status),
        description = COALESCE(:description, description)
      WHERE id = :id
    `;

    await db.query(updateSql, {
      replacements: { 
        id, 
        status: status || null, 
        description: description || null 
      }
    });

    res.json({ message: `Space ${id} updated successfully.` });
  } catch (error) {
    console.error("Error updating parking space:", error);
    res.status(500).json({ error: 'Failed to update space' });
  }
});
// =========================================================================
// 6. MODULES & USER STORIES ROUTES
// =========================================================================

app.use('/admin', adminRoutes);
app.use('/help', helpRoutes);

app.use('/', zoneRoutes);
app.use('/zones', zoneRoutes);

// HU-005: Save reservation
app.post('/reservations', (req, res) => {
  const { plate, location, time, status, total } = req.body;
  const sql = `
    INSERT INTO reservations (plate, location, time, status, total)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [plate, location, time, status, total], (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error saving reservation' });
    }
    res.json({ message: 'Reservation saved successfully' });
  });
});

// HU-005: Get reservations
app.get('/reservations', (req, res) => {
  const sql = 'SELECT * FROM reservations';
  db.query(sql, (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json(error);
    }
    res.json(result);
  });
});

// HU-007: Fines
app.get('/hu-007', (req, res) => {
  res.render('HU-007', {
    title: 'Fines - SIGMUI',
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

// HU-008: Parking History
app.get('/history', (req, res) => {
  res.render('HU-008', {
    title: 'My Parking History - SIGMUI',
    fecha: new Date().toISOString().split('T')[0],
    mensaje: null
  });
});

app.get('/historial', (req, res) => res.redirect('/history'));
app.get('/hu-008', (req, res) => res.redirect('/history'));
app.get('/HU-008', (req, res) => res.redirect('/history'));

// =========================================================================
// 7. SERVER STARTUP
// =========================================================================
app.listen(PORT, () => {
  console.log(`Server running successfully at http://localhost:${PORT}`);
});