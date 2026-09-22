 feature/HU-004-start-parking-time
const mysql = require("mysql2");
const connection = mysql.createPool({

    host: "localhost",

    user: "root",

    password: "",

    database: "my_reservations",

    port: 3306,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});

connection.getConnection((error, db)=>{


    if(error){

        console.error("❌ Error conectando a MySQL:");
        console.error(error.message);

        return;

    }

    console.log("✅ Conexión exitosa a MySQL");


    db.release();


});

module.exports = connection;
=======
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const db = new Sequelize(
  process.env.DB_NAME || 'sigmui_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

export default db;
 develop
