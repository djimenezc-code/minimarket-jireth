const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
// Importamos las herramientas de configuración de Transbank
const { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } = require('transbank-sdk');

const app = express();
const db = new sqlite3.Database('./minimarket.db');

// --- CONFIGURACIÓN TÉCNICA ---
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'infra-jireth-secure-token-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- CONFIGURACIÓN DE INFORMACIÓN DEL NEGOCIO ---
const storeInfo = {
    direccion: "Av San Martin, Talagante",
    horario: "Lun-Sáb: 08:30 - 20:30 | Dom: 10:00 - 15:00",
    telefono: "+56 9 48 539049", // Tu nuevo teléfono
    // Para el mapa, debes obtener el link de "Insertar mapa" de Google Maps
    mapa:"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3321.1101914710953!2d-70.9092431!3d-33.654306600000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662e3d678a75cff%3A0xc39b82e12c257e82!2sSan%20Mart%C3%ADn%2C%20Talagante%2C%20Regi%C3%B3n%20Metropolitana!5e0!3m2!1ses!2scl!4v1775998583190!5m2!1ses!2scl" 
};

// --- MIDDLEWARE DE CONTEO GLOBAL ---
app.use((req, res, next) => {
    res.locals.cantidad = req.session.carrito ? req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) : 0;
    res.locals.user = req.session.userName || null;
    next();
});

// --- RUTAS DE TIENDA ---
app.get('/', (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => {
        res.render('index', { productos: rows, info: storeInfo });
    });
});

// --- AUTENTICACIÓN ---
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

app.get('/registro', (req, res) => res.render('registro'));

app.post('/registro', (req, res) => {
    const { nombre, email, password } = req.body;
    db.run("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", [nombre, email, password], (err) => {
        if (err) return res.send("Error al registrar: El email ya existe.");
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- CARRITO ---
app.post('/agregar-al-carrito', (req, res) => {
    const { id, nombre, precio } = req.body;
    if (!req.session.carrito) req.session.carrito = [];
    const item = req.session.carrito.find(p => p.id == id);
    if (item) item.cantidad++;
    else req.session.carrito.push({ id, nombre, precio: parseInt(precio), cantidad: 1 });
    const total = req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0);
    res.json({ cantidad: total });
});

app.get('/carrito', (req, res) => {
    res.render('carrito', { carrito: req.session.carrito || [] });
});

app.post('/carrito/update', (req, res) => {
    const { id, accion } = req.body;
    let carrito = req.session.carrito || [];
    const item = carrito.find(p => p.id == id);
    if (item) {
        if (accion === 'sumar') item.cantidad++;
        else if (accion === 'restar' && item.cantidad > 1) item.cantidad--;
        else if (accion === 'eliminar') carrito = carrito.filter(p => p.id != id);
    }
    req.session.carrito = carrito;
    res.json({ success: true });
});

// --- ADMINISTRACIÓN ---
app.get('/admin', (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => res.render('admin', { productos: rows }));
});

app.post('/admin/agregar', (req, res) => {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    db.run("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?,?,?,?,?)", 
    [nombre, categoria, precio, stock, imagen], () => res.redirect('/admin'));
});

app.post('/admin/editar', (req, res) => {
    const { id, precio, stock } = req.body;
    db.run("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id], () => {
        res.json({ success: true });
    });
});

app.get('/admin/eliminar/:id', (req, res) => {
    db.run("DELETE FROM productos WHERE id = ?", [req.params.id], () => res.redirect('/admin'));
});

// --- WEBPAY (ESTA ES LA VERSIÓN QUE ELIMINA EL ERROR DE COMMERCECODE) ---
app.post('/webpay/pagar', async (req, res) => {
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    
    if (total <= 0) return res.redirect('/');
    
    try {
        // SOLUCIÓN: Creamos la transacción con Opciones de Integración explícitas
        const tx = new WebpayPlus.Transaction(new Options(
            IntegrationCommerceCodes.WEBPAY_PLUS, 
            IntegrationApiKeys.WEBPAY, 
            Environment.Integration
        ));
        
        const buyOrder = "O-" + Math.floor(Math.random() * 10000);
        const sessionId = "S-" + Math.floor(Math.random() * 10000);
        const returnUrl = req.protocol + '://' + req.get('host') + '/webpay/retorno';

        const response = await tx.create(buyOrder, sessionId, total, returnUrl);
        
        res.render('webpay_pago', { 
            url: response.url, 
            token: response.token 
        });
    } catch (e) {
        console.error("Error técnico Webpay:", e);
        res.status(500).send("Error al conectar con Transbank: " + e.message);
    }
});

app.get('/webpay/retorno', (req, res) => {
    req.session.carrito = []; // Limpiamos el carrito
    res.render('exito');      // Renderizamos la vista bonita
});

app.listen(3000, () => console.log('🚀 Jireth Pro Online | http://localhost:3000'));