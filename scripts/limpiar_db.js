require('dotenv').config();
const { Pool } = require('pg');

const pool = require('../db'); // Reutilizamos la configuración de conexión desde db.js

async function main() {
    try {
        await pool.query("DELETE FROM productos");
        console.log("✅ Tabla de productos vaciada. Espacio limpio para el nuevo inventario.");
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
