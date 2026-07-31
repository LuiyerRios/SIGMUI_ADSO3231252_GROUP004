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