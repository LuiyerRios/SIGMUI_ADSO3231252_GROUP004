const mysql = require("mysql2");


const connection = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "",

    database: "my_reservations"

});



connection.connect((error)=>{


    if(error){

        console.error("Error conectando a MySQL:", error.message);

        return;

    }


    console.log("Conexión exitosa a MySQL");


});



module.exports = connection;