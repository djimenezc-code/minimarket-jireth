// init_db.js — Inicialización única de la base de datos PostgreSQL
// Jireth Minimarket
//
// Requiere el paquete "pg":   npm install pg
//
// Variables de entorno esperadas en tu .env (ver db.js):
//   PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
//
// Uso:  node scripts/init_db.js

require('dotenv').config();

const pool = require('../db'); // Reutilizamos la configuración de conexión desde db.js

// Productos de prueba (semilla inicial)
const PRODUCTOS_SEED = [
    ['Arroz Grado 1 (1kg)', 1200, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 'Abarrotes', 50],
    ['Leche Entera 1L', 1050, 'https://images.unsplash.com/photo-1550583724-b26cc28df5d1?w=400', 'Lácteos', 30],
    ['Aceite Vegetal 900ml', 2500, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 'Abarrotes', 20],
    ['Detergente Multiuso', 4500, 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?w=400', 'Limpieza', 15],
    ['Pack de Yogur (4u)', 1800, 'https://images.unsplash.com/photo-1571212518486-d8285ee2b398?w=400', 'Lácteos', 25],
];

async function init() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Tabla de usuarios (incluye columnas de roles/verificación
        //    que en la versión SQLite se agregaban con ALTER TABLE)
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id                  SERIAL PRIMARY KEY,
                nombre              TEXT,
                email               TEXT UNIQUE,
                password            TEXT,
                is_admin            INTEGER DEFAULT 0,
                is_superadmin       INTEGER DEFAULT 0,
                verificado          INTEGER DEFAULT 0,
                token_verificacion  TEXT
            )
        `);
        console.log('✔ Tabla "usuarios" lista.');

        // 2. Tabla de productos
        await client.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id        SERIAL PRIMARY KEY,
                nombre    TEXT,
                precio    INTEGER,
                imagen    TEXT,
                categoria TEXT,
                stock     INTEGER
            )
        `);
        console.log('✔ Tabla "productos" lista.');

        // 3. Tabla de compras (incluye columnas de entrega)
        await client.query(`
            CREATE TABLE IF NOT EXISTS compras (
                id              SERIAL PRIMARY KEY,
                numero_compra   TEXT UNIQUE,
                usuario_id      INTEGER REFERENCES usuarios(id),
                usuario_nombre  TEXT,
                usuario_email   TEXT,
                items           TEXT,
                total           INTEGER,
                fecha           TEXT,
                hora            TEXT,
                entregado       INTEGER DEFAULT 0,
                fecha_entrega   TEXT
            )
        `);
        console.log('✔ Tabla "compras" lista.');

        // 4. Tabla de historial de compras
        await client.query(`
            CREATE TABLE IF NOT EXISTS historial_compras (
                id              SERIAL PRIMARY KEY,
                numero_compra   TEXT UNIQUE,
                usuario_id      INTEGER,
                usuario_nombre  TEXT,
                usuario_email   TEXT,
                items           TEXT,
                total           INTEGER,
                fecha           TEXT,
                hora            TEXT,
                fecha_entrega   TEXT
            )
        `);
        console.log('✔ Tabla "historial_compras" lista.');

        // 5. Insertar productos de prueba solo si la tabla está vacía
        const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM productos');
        if (rows[0].total === 0) {
            const insertText = `
                INSERT INTO productos (nombre, precio, imagen, categoria, stock)
                VALUES ($1, $2, $3, $4, $5)
            `;
            for (const producto of PRODUCTOS_SEED) {
                await client.query(insertText, producto);
            }
            console.log(`✔ ${PRODUCTOS_SEED.length} productos de prueba insertados.`);
        } else {
            console.log('ℹ La tabla "productos" ya tiene datos, se omite la siembra inicial.');
        }

        await client.query('COMMIT');
        console.log('🛒 ¡Base de datos del Minimarket lista y surtida!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('✖ Error al inicializar la base de datos:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

init();

