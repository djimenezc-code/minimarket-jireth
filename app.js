const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } = require('transbank-sdk');

const app = express();
const db = new sqlite3.Database('./minimarket.db');

// --- 1. CONFIGURACIÓN ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'infra-jireth-secure-token-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const storeInfo = {
    direccion: "Av San Martin, Talagante",
    horario: "Lun-Sáb: 08:30 - 20:30 | Dom: 10:00 - 15:00",
    telefono: "+56 9 48 539049",
    mapa: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3321.43633880629!2d-70.930419!3d-33.665219!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDM5JzU0LjgiUyA3MMKwNTUnNDkuNSJX!5e0!3m2!1ses!2scl!4v1617000000000!5m2!1ses!2scl" 
};

// Middleware para pasar datos globales a las vistas
app.use((req, res, next) => {
    res.locals.cantidad = req.session.carrito ? req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) : 0;
    res.locals.user = req.session.userName || null;
    res.locals.isAdmin = req.session.isAdmin || false; // Para saber si es admin en el menú
    next();
});

// --- 2. SEGURIDAD: MIDDLEWARE PARA ADMIN ---
function protegerAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

// --- 3. RUTAS DE TIENDA ---
app.get('/', (req, res) => {
    const search = req.query.search;
    let query = "SELECT * FROM productos";
    let params = [];
    if (search) {
        query += " WHERE nombre LIKE ? OR categoria LIKE ?";
        params = [`%${search}%`, `%${search}%`];
    }
    db.all(query, params, (err, rows) => {
        res.render('index', { productos: rows, info: storeInfo });
    });
});

// Login de Usuario Normal
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email, password], (err, user) => {
        if (user) {
            req.session.userId = user.id;
            req.session.userName = user.nombre;
            res.redirect('/');
        } else {
            res.render('login', { error: "Credenciales incorrectas" });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- 4. RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---

// Pantalla para poner la clave de admin
app.get('/admin/login', (req, res) => {
    res.render('admin_login', { error: null });
});

// Procesar clave de admin
app.post('/admin/login', (req, res) => {
    const { user, pass } = req.body;
    // AQUÍ CONFIGURAS TU CLAVE:
    if (user === 'admin' && pass === 'jireth2026') { 
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('admin_login', { error: "Clave de acceso denegada" });
    }
});

// El panel solo abre si 'protegerAdmin' da permiso
app.get('/admin', protegerAdmin, (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => {
        if (err) return res.send("Error al cargar productos");
        res.render('admin', { productos: rows });
    });
});

app.post('/admin/agregar', protegerAdmin, (req, res) => {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    db.run("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?,?,?,?,?)", 
    [nombre, categoria, precio, stock, imagen], (err) => {
        res.redirect('/admin');
    });
});

app.post('/admin/editar', protegerAdmin, (req, res) => {
    const { id, precio, stock } = req.body;
    db.run("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id], (err) => {
        res.json({ success: !err });
    });
});

app.get('/admin/eliminar/:id', protegerAdmin, (req, res) => {
    db.run("DELETE FROM productos WHERE id = ?", [req.params.id], (err) => {
        res.redirect('/admin');
    });
});

// --- 5. CARRITO Y WEBPAY ---
app.post('/agregar-al-carrito', (req, res) => {
    const { id, nombre, precio } = req.body;
    if (!req.session.carrito) req.session.carrito = [];
    const item = req.session.carrito.find(p => p.id == id);
    if (item) item.cantidad++;
    else req.session.carrito.push({ id, nombre, precio: parseInt(precio), cantidad: 1 });
    res.json({ cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) });
});

app.get('/carrito', (req, res) => {
    res.render('carrito', { carrito: req.session.carrito || [] });
});

app.post('/webpay/pagar', async (req, res) => {
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    if (total <= 0) return res.redirect('/');
    try {
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        const buyOrder = "O-" + Math.floor(Math.random() * 10000);
        const sessionId = "S-" + Math.floor(Math.random() * 10000);
        const returnUrl = req.protocol + '://' + req.get('host') + '/webpay/retorno';
        const response = await tx.create(buyOrder, sessionId, total, returnUrl);
        res.render('webpay_pago', { url: response.url, token: response.token });
    } catch (e) {
        res.status(500).send("Error Webpay: " + e.message);
    }
});

app.get('/webpay/retorno', (req, res) => {
    req.session.carrito = []; 
    res.render('exito');      
});

// --- 6. LANZAMIENTO ---
app.listen(3001, () => {
    console.log('🚀 Jireth Pro Online | http://localhost:3001');
});