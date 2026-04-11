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
// Para poder leer los datos que vienen del formulario
app.use(express.urlencoded({ extended: true }));

// Ruta para ver la página de registro
app.get('/registro', (req, res) => {
    res.render('registro');
});

// Ruta para procesar el registro (Guardar en la DB)
app.post('/registro', (req, res) => {
    const { nombre, email, password } = req.body;
    db.run("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", 
    [nombre, email, password], (err) => {
        if (err) return res.send("Error al registrar: " + err.message);
        res.send("<h1>¡Registro exitoso!</h1><a href='/'>Ir al inicio</a>");
    });
});
app.listen(3000, () => {
    console.log('🚀 Minimarket corriendo en http://localhost:3000');
}); // ESTO ES PARA QUE EL SERVIDOR ENTIENDA LOS DATOS DEL FORMULARIO
app.use(express.urlencoded({ extended: true }));

// RUTA PARA MOSTRAR LA PÁGINA DE REGISTRO
app.get('/registro', (req, res) => {
    res.render('registro'); 
});

// RUTA PARA GUARDAR LOS DATOS DEL USUARIO
app.post('/registro', (req, res) => {
    const { nombre, email, password } = req.body;
    db.run("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", 
    [nombre, email, password], (err) => {
        if (err) return res.send("Error al registrar: " + err.message);
        res.send("<h1>¡Registro exitoso!</h1><a href='/'>Ir al inicio</a>");
    });
});