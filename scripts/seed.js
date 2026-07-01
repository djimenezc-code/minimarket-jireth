require('dotenv').config();
const { Pool } = require('pg');

const pool = require('../db'); // Reutilizamos la configuración de conexión desde db.js

const productos = [
    { nombre: 'Coca Cola 1.5L', cat: 'Bebidas', precio: 1500, stock: 20, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&auto=format&fit=crop' },
    { nombre: 'Papas Fritas Lay\'s', cat: 'Snacks', precio: 1200, stock: 15, img: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=500&auto=format&fit=crop' },
    { nombre: 'Pan Molde Integral', cat: 'Panadería', precio: 2100, stock: 10, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=500&auto=format&fit=crop' },
    { nombre: 'Leche Entera 1L', cat: 'Lácteos', precio: 1100, stock: 30, img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=500&auto=format&fit=crop' },
    { nombre: 'Detergente Líquido', cat: 'Aseo', precio: 4500, stock: 8, img: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=500&auto=format&fit=crop' }
];

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Limpiamos la tabla para no duplicar
        await client.query("DELETE FROM productos");

        const insertText = "INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES ($1, $2, $3, $4, $5)";
        for (const p of productos) {
            await client.query(insertText, [p.nombre, p.cat, p.precio, p.stock, p.img]);
        }

        await client.query('COMMIT');
        console.log("✅ ¡Productos reales cargados exitosamente!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("✖ Error en seed:", err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
