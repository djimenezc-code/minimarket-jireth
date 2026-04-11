const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./minimarket.db');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ruta principal: Lee los productos de la base de datos
app.get('/', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.send("Error al cargar productos");
        } else {
            res.render('index', { productos: rows });
        }
    });
});

app.listen(3000, () => {
    console.log('🚀 Minimarket corriendo en http://localhost:3000');
});