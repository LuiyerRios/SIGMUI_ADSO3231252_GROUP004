const express = require('express');
const app = express();

app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('HU-001'); // el nombre de tu archivo .pug sin extensión
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));