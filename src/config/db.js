import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config({ quiet: true });

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  timezone: '-05:00', // hora de Colombia
  define: { underscored: true }, // atributos camelCase en JS -> columnas snake_case en MySQL
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

export default db;
