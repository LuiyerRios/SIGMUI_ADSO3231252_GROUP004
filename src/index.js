const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();


// Permitir recibir datos JSON
app.use(express.json());


// Configurar Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));


// Archivos públicos
app.use(express.static(path.join(__dirname, "public")));



// Vista principal
app.get("/", (req, res) => {
    res.render("HU-004");
});



// Guardar reserva
app.post("/reservas", (req, res) => {

    const {
        plate,
        location,
        time,
        status,
        total
    } = req.body;


    const sql = `
        INSERT INTO reservations
        (plate, location, time, status, total)
        VALUES (?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            plate,
            location,
            time,
            status,
            total
        ],
        (error, result) => {


            if(error){

                console.log(error);

                return res.status(500).json({
                    message: "Error guardando reserva"
                });

            }


            res.json({
                message:"Reserva guardada"
            });


        }
    );


});




// Obtener reservas
app.get("/reservas", (req,res)=>{


    const sql = "SELECT * FROM reservations";


    db.query(sql,(error,result)=>{


        if(error){

            console.log(error);

            return res.status(500).json(error);

        }


        res.json(result);


    });


});





const PORT = 3000;


app.listen(PORT, () => {

    console.log(`Servidor funcionando en http://localhost:${PORT}`);

});