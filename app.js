const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const { WebpayPlus } = require('transbank-sdk');

const app = express();
const db = new sqlite3.Database('./minimarket.db');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'infra-jireth-secure-2024',
    resave: false,
    saveUninitialized: true
}));

const storeInfo = {
    direccion: "Av. Las Industrias 4050, Santiago",
    horario: "Lun-Sáb: 08:30 - 20:30 | Dom: 10:00 - 15:00",
    telefono: "+56 2 2345 6789",
    mapa: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.056461427!2d-70.6504!3d-33.4372!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDI2JzEzLjEiUyA3MMKwMzknMDEuNCJX!5e0!3m2!1ses!2scl!4v1610000000000"
};

// --- RUTAS DE TIENDA ---
app.get('/', (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => {
        const total = req.session.carrito ? req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) : 0;
        res.render('index', { productos: rows, cantidad: total, info: storeInfo });
    });
});

app.post('/agregar-al-carrito', (req, res) => {
    const { id, nombre, precio } = req.body;
    if (!req.session.carrito) req.session.carrito = [];
    const item = req.session.carrito.find(p => p.id == id);
    if (item) item.cantidad++;
    else req.session.carrito.push({ id, nombre, precio: parseInt(precio), cantidad: 1 });
    res.json({ cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) });
});

app.get('/carrito', (req, res) => res.render('carrito', { carrito: req.session.carrito || [] }));

// --- RUTAS ADMINISTRATIVAS (REQ 5) ---
app.get('/admin', (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => res.render('admin', { productos: rows }));
});

app.post('/admin/agregar', (req, res) => {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    db.run("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?,?,?,?,?)", 
    [nombre, categoria, precio, stock, imagen], () => res.redirect('/admin'));
});

// Actualización rápida de Stock y Precio (Ingeniería de datos)
app.post('/admin/editar', (req, res) => {
    const { id, precio, stock } = req.body;
    db.run("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/admin/eliminar/:id', (req, res) => {
    db.run("DELETE FROM productos WHERE id = ?", [req.params.id], () => res.redirect('/admin'));
});

// --- WEBPAY INTEGRACIÓN ---
app.post('/webpay/pagar', async (req, res) => {
    const total = (req.session.carrito || []).reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    if (total <= 0) return res.redirect('/');
    const tx = new WebpayPlus.Transaction();
    const response = await tx.create("O-"+Date.now(), "S-"+Date.now(), total, req.protocol+'://'+req.get('host')+'/webpay/retorno');
    res.render('webpay_pago', { url: response.url, token: response.token });
});

app.listen(3000, () => console.log('🚀 Sistema Jireth Fully Operational'));