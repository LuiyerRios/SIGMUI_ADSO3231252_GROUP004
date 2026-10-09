import { Sequelize } from 'sequelize';

// Reemplaza 'sigmui_db', 'root' y 'tu_contraseña' con los datos reales de tu MySQL
const db = new Sequelize('sigmui_db', 'root', '123456789', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false, // Desactiva logs ruidosos en la terminal
  define: {
    timestamps: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default db;