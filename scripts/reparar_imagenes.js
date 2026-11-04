require('dotenv').config();
const { Pool } = require('pg');

const pool = require('../db'); // Reutilizamos la configuración de conexión desde db.js

// Nueva lista de enlaces VERIFICADOS Y ROBUSTOS para los productos rotos
// He seleccionado imágenes limpias y profesionales.
const reparaciones = [
    {
        nombre: 'Manzana Roja Premium',
        nuevaImagen: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
        nombre: 'Papas Primor (1kg)',
        nuevaImagen: 'https://images.pexels.com/photos/144248/potatoes-vegetables-food-fresh-144248.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
        nombre: 'Fideos Espagueti 400g',
        nuevaImagen: 'https://images.pexels.com/photos/136743/pexels-photo-136743.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
        nombre: 'Leche Entera 1L',
        nuevaImagen: 'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
];

async function main() {
    console.log("🛠️ Iniciando reparación de imágenes rotas...");
    try {
        for (const prod of reparaciones) {
            try {
                const { rowCount } = await pool.query(
                    "UPDATE productos SET imagen = $1 WHERE nombre = $2",
                    [prod.nuevaImagen, prod.nombre]
                );
                if (rowCount > 0) {
                    console.log(`✅ Imagen de ${prod.nombre} reparada con éxito.`);
                } else {
                    console.warn(`⚠️ No se encontró el producto ${prod.nombre} para reparar.`);
                }
            } catch (err) {
                console.error(`❌ Error reparando ${prod.nombre}:`, err.message);
            }
        }
    } finally {
        await pool.end();
        console.log("✨ Proceso de reparación finalizado. Limpia la caché y recarga la web.");
    }
}

main();
