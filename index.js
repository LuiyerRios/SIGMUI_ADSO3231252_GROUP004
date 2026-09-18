const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.set("view engine", "pug");
app.set("views", path.join(__dirname, "src", "views"));



app.use(express.static(path.join(__dirname, "src", "public")));


app.get("/", (req, res) => {
    res.render("HU-009");
});


const PORT = process.env.PORT || 3306;

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});