const express = require("express");
const path = require("path");


const app = express();



app.use(express.json());



app.set(
"view engine",
"pug"
);



app.set(
"views",
path.join(__dirname,"views")
);



app.use(
express.static(
path.join(__dirname,"public")
)
);






app.get("/",(req,res)=>{


res.render("HU-004");


});








const PORT = 3000;



app.listen(PORT,()=>{


console.log(
`Servidor funcionando en http://localhost:${PORT}`
);


});