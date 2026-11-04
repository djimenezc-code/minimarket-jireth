const express = require('express');
const db = require('./db'); // Archivo db.js con mysql2
const path = require('path');
const session = require('express-session');
const { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } = require('transbank-sdk');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'infra-jireth-secure-token-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const storeInfo = {
    direccion: "Av San Martin 0443, Talagante",
    horario: "Lun-Sáb: 08:30 - 20:30 | Dom: 10:00 - 15:00",
    telefono: "+56 9 48 539049",
    mapa: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3321.43633880629!2d-70.930419!3d-33.665219!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDM5JzU0LjgiUyA3MMKwNTUnNDkuNSJX!5e0!3m2!1ses!2scl!4v1617000000000!5m2!1ses!2scl" 
};

app.use((req, res, next) => {
    res.locals.cantidad = req.session.carrito ? req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) : 0;
    res.locals.user = req.session.userName || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    next();
});

function protegerAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.redirect('/admin/login');
}

// RUTA PRINCIPAL (CATÁLOGO Y BÚSQUEDA)
app.get('/', async (req, res) => {
    try {
        const search = req.query.search;
        let query = "SELECT * FROM productos";
        let params = [];

        if (search) {
            query += " WHERE nombre LIKE ? OR categoria LIKE ?";
            params = [`%${search}%`, `%${search}%`];
        }

        const [rows] = await db.query(query, params);
        res.render('index', { productos: rows, info: storeInfo });
    } catch (err) {
        console.error("Error en la consulta de productos:", err);
        res.status(500).send("Error interno del servidor.");
    }
});

// AUTENTICACIÓN USUARIOS
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email, password]);
        if (users.length > 0) {
            const user = users[0];
            req.session.userId = user.id;
            req.session.userName = user.nombre;
            res.redirect('/');
        } else {
            res.render('login', { error: "Credenciales incorrectas" });
        }
    } catch (err) {
        console.error("Error en login:", err);
        res.render('login', { error: "Error en el servidor" });
    }
});

app.get('/registro', (req, res) => res.render('registro', { error: null }));

app.post('/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const [existing] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.render('registro', { error: "Correo ya existe." });
        }
        const [result] = await db.query("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", [nombre, email, password]);
        req.session.userId = result.insertId;
        req.session.userName = nombre;
        res.redirect('/');
    } catch (err) {
        console.error("Error en registro:", err);
        res.render('registro', { error: "Error al crear la cuenta." });
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// AUTENTICACIÓN ADMIN
app.get('/admin/login', (req, res) => res.render('admin_login', { error: null }));

app.post('/admin/login', (req, res) => {
    if (req.body.user === 'admin' && req.body.pass === 'jireth2026') { 
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('admin_login', { error: "Denegado" });
    }
});

// PANEL ADMIN
app.get('/admin', protegerAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM productos");
        res.render('admin', { productos: rows });
    } catch (err) {
        console.error("Error en panel admin:", err);
        res.status(500).send("Error al cargar productos.");
    }
});

app.post('/admin/agregar', protegerAdmin, async (req, res) => {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    try {
        await db.query("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)", [nombre, categoria, precio, stock, imagen]);
        res.redirect('/admin');
    } catch (err) {
        console.error("Error al agregar producto:", err);
        res.status(500).send("Error al guardar producto.");
    }
});

app.post('/admin/editar', protegerAdmin, async (req, res) => {
    const { id, precio, stock } = req.body;
    try {
        await db.query("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error al editar producto:", err);
        res.json({ success: false });
    }
});

app.get('/admin/eliminar/:id', protegerAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM productos WHERE id = ?", [req.params.id]);
        res.redirect('/admin');
    } catch (err) {
        console.error("Error al eliminar producto:", err);
        res.redirect('/admin');
    }
});

// CARRITO
app.post('/agregar-al-carrito', (req, res) => {
    const { id, nombre, precio, imagen } = req.body;
    if (!req.session.carrito) req.session.carrito = [];
    const item = req.session.carrito.find(p => p.id == id);
    if (item) {
        item.cantidad++;
    } else {
        req.session.carrito.push({ 
            id, 
            nombre, 
            precio: parseInt(precio), 
            cantidad: 1, 
            imagen 
        });
    }
    res.json({ cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) });
});

app.post('/carrito/update', (req, res) => {
    const { id, accion } = req.body;
    if (!req.session.carrito) return res.json({ success: false });
    let carrito = req.session.carrito;
    const index = carrito.findIndex(p => p.id == id);
    if (index !== -1) {
        if (accion === 'sumar') carrito[index].cantidad++;
        else if (accion === 'restar') {
            carrito[index].cantidad--;
            if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
        } else if (accion === 'eliminar') carrito.splice(index, 1);
    }
    req.session.carrito = carrito;
    res.json({ success: true });
});

app.get('/carrito', (req, res) => res.render('carrito', { carrito: req.session.carrito || [] }));

// PASARELA DE PAGO WEBPAY
app.post('/webpay/pagar', async (req, res) => {
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    if (total <= 0) return res.redirect('/');
    try {
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        const response = await tx.create("O-" + Date.now(), "S-" + Date.now(), total, req.protocol + '://' + req.get('host') + '/webpay/retorno');
        res.render('webpay_pago', { url: response.url, token: response.token });
    } catch (e) { res.status(500).send("Error Webpay: " + e.message); }
});

app.get('/webpay/retorno', (req, res) => {
    req.session.carrito = []; 
    res.render('exito');      
});

app.listen(3001, () => {
    console.log('🚀 Jireth Pro Online | http://localhost:3001');
});