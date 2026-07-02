require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const multer = require('multer');

// ── MULTER (subida de imágenes) ───────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/images/productos')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const nombre = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
        cb(null, nombre);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});
const { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } = require('transbank-sdk');

const app = express();

// ── BASE DE DATOS (PostgreSQL) ────────────────────────────────────────────────
// Las tablas se crean con init_db.js. Aquí solo nos conectamos.
const pool = require('./db');

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

// ── NODEMAILER ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

function generarNumeroCompra() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'JR-';
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function generarTokenVerificacion() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
    return token;
}

function htmlBoleta({ numero_compra, usuario_nombre, usuario_email, items, total, fecha, hora }) {
    const itemsParseados = typeof items === 'string' ? JSON.parse(items) : items;
    const filas = itemsParseados.map(i => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i.nombre}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.cantidad}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${i.precio.toLocaleString('es-CL')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${(i.precio * i.cantidad).toLocaleString('es-CL')}</td>
        </tr>`).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:30px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;letter-spacing:-0.5px;">🛒 Jireth Minimarket</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Boleta de Compra</p>
    </div>
    <div style="padding:28px 32px;">
        <div style="background:#eff6ff;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <div style="margin-bottom:14px;">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">N° Compra</div>
                <div style="font-size:20px;font-weight:800;color:#2563eb;letter-spacing:2px;margin-top:2px;">${numero_compra}</div>
            </div>
            <div style="border-top:1px solid #bfdbfe;padding-top:12px;display:flex;gap:32px;">
                <div>
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">Fecha</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${fecha}</div>
                </div>
                <div>
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">Hora</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${hora}</div>
                </div>
            </div>
        </div>
        <div style="margin-bottom:20px;">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:4px;">Cliente</div>
            <div style="font-weight:600;color:#1e293b;">${usuario_nombre}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;">Producto</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;">Cant.</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;">Precio</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;">Subtotal</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
        <div style="border-top:2px solid #e2e8f0;padding-top:16px;text-align:right;">
            <span style="font-size:13px;color:#6b7280;margin-right:12px;">TOTAL</span>
            <span style="font-size:22px;font-weight:800;color:#2563eb;">$${total.toLocaleString('es-CL')}</span>
        </div>
    </div>
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Gracias por tu compra • Jireth Minimarket • Av San Martín 0443, Talagante</p>
    </div>
</div>
</body></html>`;
}

async function enviarBoleta(compra) {
    const html = htmlBoleta(compra);
    // Al usuario
    await transporter.sendMail({
        from: `"Jireth Minimarket" <${process.env.GMAIL_USER}>`,
        to: compra.usuario_email,
        subject: `✅ Boleta de compra ${compra.numero_compra} — Jireth Minimarket`,
        html
    });
    // Al admin
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL !== compra.usuario_email) {
        await transporter.sendMail({
            from: `"Jireth Minimarket" <${process.env.GMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `🛒 Nueva compra ${compra.numero_compra} — ${compra.usuario_nombre}`,
            html
        });
    }
}

async function enviarVerificacion(email, nombre, token) {
    const link = `${process.env.APP_URL || 'http://localhost:3001'}/verificar/${token}`;
    await transporter.sendMail({
        from: `"Jireth Minimarket" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: '📧 Verifica tu correo — Jireth Minimarket',
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">🛒 Jireth Minimarket</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Verifica tu correo electrónico</p>
    </div>
    <div style="padding:32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">📬</div>
        <h2 style="color:#1e293b;margin:0 0 12px;font-size:20px;">Hola, ${nombre}!</h2>
        <p style="color:#64748b;margin:0 0 28px;line-height:1.6;">Para activar tu cuenta y comenzar a comprar, haz clic en el botón de abajo.</p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Verificar mi correo</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Si no creaste esta cuenta, ignora este correo.</p>
    </div>
</div>
</body></html>`
    });
}

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
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
    res.locals.isSuperAdmin = req.session.isSuperAdmin || false;
    next();
});

function protegerAdmin(req, res, next) {
    if (req.session.isAdmin || req.session.isSuperAdmin) return next();
    res.redirect('/admin/login');
}
function protegerSuperAdmin(req, res, next) {
    if (req.session.isSuperAdmin) return next();
    res.status(403).send('Acceso denegado. Solo para Super Administradores.');
}
function protegerUsuario(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// ── TIENDA ───────────────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
    if (req.session.isSuperAdmin) return res.redirect('/superadmin');
    const search = req.query.search;
    let query = "SELECT * FROM productos";
    let params = [];
    if (search) {
        query += " WHERE nombre ILIKE $1 OR categoria ILIKE $2";
        params = [`%${search}%`, `%${search}%`];
    }
    try {
        const { rows } = await pool.query(query, params);
        res.render('index', { productos: rows, info: storeInfo });
    } catch (err) {
        res.status(500).send("Error interno.");
    }
});

// ── AUTH USUARIOS ────────────────────────────────────────────────────────────
app.get('/login', (req, res) => res.render('login', { error: null, mensaje: req.query.comprar ? 'Debes iniciar sesión para poder comprar.' : null }));
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1 AND password = $2", [email, password]);
        const user = rows[0];
        if (!user) return res.render('login', { error: "Credenciales incorrectas", mensaje: null });
        if (!user.verificado) return res.render('login', { error: "Debes verificar tu correo antes de ingresar. Revisa tu Gmail.", mensaje: null });
        req.session.userId = user.id;
        req.session.userName = user.nombre;
        res.redirect('/');
    } catch (err) {
        res.render('login', { error: "Error al iniciar sesión.", mensaje: null });
    }
});

app.get('/registro', (req, res) => res.render('registro', { error: null, mensaje: null }));
app.post('/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (rows[0]) return res.render('registro', { error: "Correo ya registrado.", mensaje: null });

        const token = generarTokenVerificacion();
        try {
            await pool.query(
                "INSERT INTO usuarios (nombre, email, password, verificado, token_verificacion) VALUES ($1, $2, $3, 0, $4)",
                [nombre, email, password, token]
            );
        } catch (err) {
            return res.render('registro', { error: "Error al crear cuenta.", mensaje: null });
        }

        try {
            await enviarVerificacion(email, nombre, token);
            res.render('registro', { error: null, mensaje: `Cuenta creada. Revisa tu Gmail (${email}) para verificar tu cuenta.` });
        } catch (e) {
            console.error('Error enviando verificación:', e.message);
            res.render('registro', { error: null, mensaje: `Cuenta creada pero hubo un error enviando el correo. Contacta al administrador.` });
        }
    } catch (err) {
        res.render('registro', { error: "Error al crear cuenta.", mensaje: null });
    }
});

app.get('/verificar/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const { rows } = await pool.query("SELECT * FROM usuarios WHERE token_verificacion = $1", [token]);
        const user = rows[0];
        if (!user) return res.send(`<h2>Link inválido o ya utilizado.</h2><a href="/login">Volver</a>`);
        await pool.query("UPDATE usuarios SET verificado = 1, token_verificacion = NULL WHERE id = $1", [user.id]);
        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Verificado</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head><body class="d-flex align-items-center justify-content-center" style="min-height:100vh;background:#f0fdf4;">
        <div class="text-center p-5 bg-white rounded-4 shadow" style="max-width:400px;">
            <div style="font-size:3rem">✅</div>
            <h2 class="mt-3 fw-bold">¡Correo verificado!</h2>
            <p class="text-muted">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <a href="/login" class="btn btn-primary rounded-3 px-4">Iniciar sesión</a>
        </div></body></html>`);
    } catch (err) {
        res.status(500).send("Error al verificar el correo.");
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ── AUTH ADMIN ───────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => res.render('admin_login', { error: null }));
app.post('/admin/login', async (req, res) => {
    if (req.body.user === 'superadmin' && req.body.pass === 'jireth2026super') {
        req.session.isAdmin = true;
        req.session.isSuperAdmin = true;
        req.session.userName = 'Super Admin';
        return res.redirect('/superadmin');
    }
    if (req.body.user === 'admin' && req.body.pass === 'jireth2026') {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    }
    try {
        const { rows } = await pool.query(
            "SELECT * FROM usuarios WHERE (email = $1 OR nombre = $2) AND password = $3 AND (is_admin = 1 OR is_superadmin = 1)",
            [req.body.user, req.body.user, req.body.pass]
        );
        const user = rows[0];
        if (user) {
            req.session.isAdmin = true;
            req.session.userId = user.id;
            req.session.userName = user.nombre;
            if (user.is_superadmin) {
                req.session.isSuperAdmin = true;
                return res.redirect('/superadmin');
            }
            return res.redirect('/admin');
        }
        res.render('admin_login', { error: "Credenciales incorrectas" });
    } catch (err) {
        res.render('admin_login', { error: "Error al iniciar sesión." });
    }
});

// ── PANEL ADMIN ──────────────────────────────────────────────────────────────
app.get('/admin', protegerAdmin, async (req, res) => {
    try {
        const { rows: productos } = await pool.query("SELECT * FROM productos");
        const { rows: compras } = await pool.query(
            `SELECT c.*, u.email as email FROM compras c
             LEFT JOIN usuarios u ON c.usuario_id = u.id
             ORDER BY c.id DESC`
        );
        // agrupar compras por usuario
        const porUsuario = {};
        (compras || []).forEach(c => {
            if (!porUsuario[c.usuario_id]) {
                porUsuario[c.usuario_id] = {
                    nombre: c.usuario_nombre,
                    email: c.usuario_email,
                    compras: []
                };
            }
            porUsuario[c.usuario_id].compras.push(c);
        });
        res.render('admin', { productos, comprasPorUsuario: porUsuario, todasCompras: compras || [] });
    } catch (err) {
        res.status(500).send("Error al cargar el panel de administración.");
    }
});

app.post('/admin/agregar', protegerAdmin, upload.single('imagen_file'), async (req, res) => {
    const { nombre, categoria, precio, stock } = req.body;
    const precioInt = parseInt(precio) || 0;
    const stockInt = parseInt(stock) || 0;
    if (precioInt >= 10000) return res.redirect('/admin?error=precio');
    if (stockInt >= 10000) return res.redirect('/admin?error=stock');
    // Si subió un archivo, usar ese nombre; si no, usar el texto escrito
    const imagen = req.file ? req.file.filename : (req.body.imagen || '');
    try {
        await pool.query(
            "INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES ($1,$2,$3,$4,$5)",
            [nombre, categoria, precioInt, stockInt, imagen]
        );
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("Error al agregar el producto.");
    }
});

app.post('/admin/editar', protegerAdmin, async (req, res) => {
    const { id, precio, stock } = req.body;
    try {
        await pool.query("UPDATE productos SET precio = $1, stock = $2 WHERE id = $3", [precio, stock, id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

app.post('/admin/agregar-stock', protegerAdmin, async (req, res) => {
    const { id, cantidad } = req.body;
    const cant = parseInt(cantidad);
    if (!id || !cant || cant <= 0) return res.json({ success: false });
    try {
        // Verificar que no supere el límite
        const { rows: rows0 } = await pool.query("SELECT stock FROM productos WHERE id = $1", [id]);
        const prod0 = rows0[0];
        if (!prod0) return res.json({ success: false });
        const stockActual = parseInt(prod0.stock) || 0;
        if (stockActual + cant >= 10000) return res.json({ success: false, error: 'El stock no puede llegar a 10.000 unidades o más' });

        await pool.query("UPDATE productos SET stock = CAST(COALESCE(stock,0) AS INTEGER) + $1 WHERE id = $2", [cant, id]);
        const { rows } = await pool.query("SELECT stock FROM productos WHERE id = $1", [id]);
        res.json({ success: true, nuevoStock: rows[0] ? rows[0].stock : null });
    } catch (err) {
        res.json({ success: false });
    }
});

app.get('/admin/eliminar/:id', protegerAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM productos WHERE id = $1", [req.params.id]);
    } catch (err) {
        // continúa igualmente, igual que el comportamiento original
    }
    res.redirect('/admin');
});

// ── ENTREGA DE COMPRAS ────────────────────────────────────────────────────────
app.post('/admin/marcar-entrega', protegerAdmin, async (req, res) => {
    const { numero_compra, entregado } = req.body;
    const fecha_entrega = entregado
        ? new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
        : null;

    if (entregado) {
        // Mover a historial y eliminar de compras activas
        try {
            const { rows } = await pool.query("SELECT * FROM compras WHERE numero_compra = $1", [numero_compra]);
            const compra = rows[0];
            if (!compra) return res.json({ success: false, error: 'Compra no encontrada' });

            await pool.query(
                `INSERT INTO historial_compras
                 (numero_compra, usuario_id, usuario_nombre, usuario_email, items, total, fecha, hora, fecha_entrega)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (numero_compra) DO NOTHING`,
                [compra.numero_compra, compra.usuario_id, compra.usuario_nombre,
                compra.usuario_email, compra.items, compra.total,
                compra.fecha, compra.hora, fecha_entrega]
            );

            await pool.query("DELETE FROM compras WHERE numero_compra = $1", [numero_compra]);
            res.json({ success: true, fecha_entrega, eliminado: true });
        } catch (err) {
            res.json({ success: false, error: err.message });
        }
    } else {
        // Desmarcar entrega (solo si aún está en compras activas)
        try {
            await pool.query(
                "UPDATE compras SET entregado = 0, fecha_entrega = NULL WHERE numero_compra = $1",
                [numero_compra]
            );
            res.json({ success: true, fecha_entrega: null });
        } catch (err) {
            res.json({ success: false, fecha_entrega: null });
        }
    }
});

// Limpieza automática: elimina registros de entrega con más de 1 mes
async function limpiarEntregasAntiguas() {
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    try {
        const { rows } = await pool.query("SELECT id, fecha_entrega FROM compras WHERE entregado = 1 AND fecha_entrega IS NOT NULL");
        for (const row of rows || []) {
            // fecha_entrega guardada como string local, parseamos dd-mm-aaaa hh:mm
            const partes = row.fecha_entrega.match(/(\d+)[\/\-](\d+)[\/\-](\d+)/);
            if (!partes) continue;
            const [, d, m, a] = partes;
            const fecha = new Date(parseInt(a), parseInt(m) - 1, parseInt(d));
            if (fecha < haceUnMes) {
                await pool.query("UPDATE compras SET entregado = 0, fecha_entrega = NULL WHERE id = $1", [row.id]);
            }
        }
    } catch (err) {
        console.error('Error en limpiarEntregasAntiguas:', err.message);
    }
}
// Ejecutar limpieza al iniciar y cada 24 horas
limpiarEntregasAntiguas();
setInterval(limpiarEntregasAntiguas, 24 * 60 * 60 * 1000);

// ── HISTORIAL DE COMPRAS ──────────────────────────────────────────────────────
app.get('/admin/historial', protegerAdmin, async (req, res) => {
    const { usuario, fecha } = req.query;
    let query = "SELECT * FROM historial_compras WHERE 1=1";
    const params = [];
    if (usuario && usuario.trim()) {
        params.push('%' + usuario.trim() + '%', '%' + usuario.trim() + '%');
        query += ` AND (usuario_nombre ILIKE $${params.length - 1} OR usuario_email ILIKE $${params.length})`;
    }
    if (fecha && fecha.trim()) {
        params.push('%' + fecha.trim() + '%');
        query += ` AND fecha ILIKE $${params.length}`;
    }
    query += " ORDER BY id DESC";
    try {
        const { rows } = await pool.query(query, params);
        res.render('historial', { compras: rows || [], usuario: usuario || '', fecha: fecha || '' });
    } catch (err) {
        res.render('historial', { compras: [], usuario: usuario || '', fecha: fecha || '' });
    }
});

// ── SUPER ADMIN ──────────────────────────────────────────────────────────────
app.get('/superadmin', protegerSuperAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, nombre, email, is_admin, is_superadmin FROM usuarios ORDER BY nombre");
        res.render('superadmin', { usuarios: rows });
    } catch (err) {
        res.status(500).send("Error al cargar usuarios.");
    }
});

app.post('/superadmin/asignar-admin', protegerSuperAdmin, async (req, res) => {
    const { userId, accion } = req.body;
    if (!userId || !['asignar', 'quitar'].includes(accion)) return res.json({ success: false });
    try {
        await pool.query("UPDATE usuarios SET is_admin = $1 WHERE id = $2", [accion === 'asignar' ? 1 : 0, userId]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

app.post('/superadmin/asignar-superadmin', protegerSuperAdmin, async (req, res) => {
    const { userId, accion } = req.body;
    if (!userId || !['asignar', 'quitar'].includes(accion)) return res.json({ success: false });
    const valor = accion === 'asignar' ? 1 : 0;
    try {
        await pool.query("UPDATE usuarios SET is_superadmin = $1, is_admin = $2 WHERE id = $3", [valor, valor, userId]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

app.post('/superadmin/eliminar-usuario', protegerSuperAdmin, async (req, res) => {
    const { userId } = req.body;
    try {
        await pool.query("DELETE FROM usuarios WHERE id = $1", [userId]);
        res.json({ success: true, error: null });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ── CARRITO ──────────────────────────────────────────────────────────────────
app.post('/agregar-al-carrito', protegerUsuario, async (req, res) => {
    const { id, nombre, precio, imagen } = req.body;
    try {
        const { rows } = await pool.query("SELECT stock FROM productos WHERE id = $1", [id]);
        const prod = rows[0];
        if (!prod) return res.json({ error: "Producto no encontrado" });
        const stockDisponible = parseInt(prod.stock) || 0;
        if (!req.session.carrito) req.session.carrito = [];
        const item = req.session.carrito.find(p => p.id == id);
        const cantidadActual = item ? item.cantidad : 0;
        if (stockDisponible <= 0) return res.json({ cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0), error: 'Producto sin stock disponible.' });
        if (cantidadActual >= stockDisponible) {
            return res.json({
                cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0),
                error: `Stock insuficiente. Solo hay ${stockDisponible} unidad(es) disponible(s).`
            });
        }
        if (item) item.cantidad++;
        else req.session.carrito.push({ id, nombre, precio: parseInt(precio), cantidad: 1, imagen });
        res.json({ cantidad: req.session.carrito.reduce((acc, i) => acc + i.cantidad, 0) });
    } catch (err) {
        res.json({ error: "Producto no encontrado" });
    }
});

app.post('/carrito/update', async (req, res) => {
    const { id, accion } = req.body;
    if (!req.session.carrito) return res.json({ success: false });
    let carrito = req.session.carrito;
    const index = carrito.findIndex(p => p.id == id);
    if (index === -1) return res.json({ success: false });
    if (accion === 'sumar') {
        try {
            const { rows } = await pool.query("SELECT stock FROM productos WHERE id = $1", [id]);
            const prod = rows[0];
            if (prod && carrito[index].cantidad >= prod.stock) {
                return res.json({ success: false, error: `Stock insuficiente. Solo hay ${prod.stock} unidad(es) disponible(s).` });
            }
            carrito[index].cantidad++;
            req.session.carrito = carrito;
            res.json({ success: true });
        } catch (err) {
            res.json({ success: false });
        }
    } else if (accion === 'restar') {
        carrito[index].cantidad--;
        if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
        req.session.carrito = carrito;
        res.json({ success: true });
    } else if (accion === 'eliminar') {
        carrito.splice(index, 1);
        req.session.carrito = carrito;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/carrito', protegerUsuario, (req, res) => res.render('carrito', { carrito: req.session.carrito || [] }));

// ── PAGO Y BOLETA ────────────────────────────────────────────────────────────
async function procesarCompra(req, res) {
    const carritoComprado = req.session.carrito || [];
    if (carritoComprado.length === 0) return res.redirect('/');

    const actualizaciones = carritoComprado.map(item =>
        pool.query("UPDATE productos SET stock = GREATEST(0, stock - $1) WHERE id = $2", [item.cantidad, item.id])
    );

    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const numero_compra = generarNumeroCompra();
    const total = carritoComprado.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);

    // Obtener email del usuario
    const usuarioId = req.session.userId;
    const usuarioNombre = req.session.userName || 'Cliente';

    const guardarYEnviar = async (emailUsuario) => {
        const compra = {
            numero_compra,
            usuario_id: usuarioId || null,
            usuario_nombre: usuarioNombre,
            usuario_email: emailUsuario,
            items: JSON.stringify(carritoComprado),
            total,
            fecha,
            hora
        };

        try {
            await pool.query(
                `INSERT INTO compras (numero_compra, usuario_id, usuario_nombre, usuario_email, items, total, fecha, hora)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [compra.numero_compra, compra.usuario_id, compra.usuario_nombre, compra.usuario_email,
                compra.items, compra.total, compra.fecha, compra.hora]
            );
            try { await enviarBoleta(compra); } catch (e) { console.error('Error enviando boleta:', e.message); }
        } catch (err) {
            console.error('Error guardando compra:', err.message);
        }

        req.session.carrito = [];
        res.render('exito', { numero_compra, fecha, hora });
    };

    Promise.all(actualizaciones).catch(err => console.error("Error stock:", err));

    if (usuarioId) {
        try {
            const { rows } = await pool.query("SELECT email FROM usuarios WHERE id = $1", [usuarioId]);
            await guardarYEnviar(rows[0] ? rows[0].email : 'sin-email@jireth.cl');
        } catch (err) {
            await guardarYEnviar('sin-email@jireth.cl');
        }
    } else {
        await guardarYEnviar('sin-email@jireth.cl');
    }
}

app.post('/webpay/pagar', protegerUsuario, async (req, res) => {
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    if (total <= 0) return res.redirect('/');
    try {
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        const response = await tx.create("O-" + Date.now(), "S-" + Date.now(), total, req.protocol + '://' + req.get('host') + '/webpay/retorno');
        res.render('webpay_pago', { url: response.url, token: response.token });
    } catch (e) { res.status(500).send("Error Webpay: " + e.message); }
});

app.get('/webpay/retorno', async (req, res) => {
    const token = req.query.token_ws;
    if (!token) return res.redirect('/');
    try {
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        const respuesta = await tx.commit(token);
        if (!respuesta || respuesta.status !== 'AUTHORIZED') return res.redirect('/');
    } catch (e) { return res.redirect('/'); }
    await procesarCompra(req, res);
});

app.post('/compra-directa', protegerUsuario, async (req, res) => {
    await procesarCompra(req, res);
});

app.listen(3001, () => {
    console.log('🚀 Jireth Pro Online | http://localhost:3001');
});
