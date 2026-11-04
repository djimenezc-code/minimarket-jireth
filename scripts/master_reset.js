require('dotenv').config();
const { Pool } = require('pg');

const pool = require('../db'); // Reutilizamos la configuración de conexión desde db.js

const productosMaster = [
    // FRUTAS Y VERDURAS
    ['Papas Primor Selección (1kg)', 'Verduras', 1200, 100, 'https://images.pexels.com/photos/144248/potatoes-vegetables-food-fresh-144248.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Tomate Larga Vida Grado 1', 'Verduras', 1850, 60, 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Plátano Cavendish Importado', 'Verduras', 1400, 80, 'https://images.pexels.com/photos/2870882/pexels-photo-2870882.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Lechuga Hidropónica Fresca', 'Verduras', 1100, 30, 'https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Zanahoria Premium (1kg)', 'Verduras', 950, 50, 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=400'],

    // LÁCTEOS Y DESAYUNO
    ['Leche Entera Soprole 1L', 'Lácteos', 1150, 120, 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Yogurt Batido Frutilla', 'Lácteos', 450, 200, 'https://images.pexels.com/photos/5945903/pexels-photo-5945903.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Queso Gauda Laminado 250g', 'Lácteos', 2800, 40, 'https://images.pexels.com/photos/4109943/pexels-photo-4109943.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Mantequilla con Sal 250g', 'Lácteos', 2100, 35, 'https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Huevos Blancos Grande (12u)', 'Lácteos', 3200, 50, 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=400'],

    // ABARROTES
    ['Arroz Grano Largo 1kg', 'Abarrotes', 1400, 100, 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Aceite de Maravilla 1L', 'Abarrotes', 2600, 60, 'https://images.pexels.com/photos/1029324/pexels-photo-1029324.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Fideos Espagueti N°5 400g', 'Abarrotes', 850, 150, 'https://images.pexels.com/photos/136743/pexels-photo-136743.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Harina con Polvos 1kg', 'Abarrotes', 1250, 80, 'https://images.pexels.com/photos/5765/food-Sugar-powder-flour.jpg?auto=compress&cs=tinysrgb&w=400'],
    ['Café Instantáneo Nescafé 170g', 'Abarrotes', 4900, 30, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400'],

    // LIMPIEZA
    ['Lavalozas Quix Limón 750ml', 'Limpieza', 1950, 45, 'https://images.pexels.com/photos/6612664/pexels-photo-6612664.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Cloro Tradicional 1L', 'Limpieza', 1100, 60, 'https://images.pexels.com/photos/6446709/pexels-photo-6446709.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Detergente Líquido Ariel 3L', 'Limpieza', 8900, 20, 'https://images.pexels.com/photos/4546114/pexels-photo-4546114.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Papel Higiénico 4 Rollos', 'Limpieza', 2200, 50, 'https://images.pexels.com/photos/3958249/pexels-photo-3958249.jpeg?auto=compress&cs=tinysrgb&w=400'],

    // DULCES Y SNACKS
    ['Papas Fritas Lay\'s Familiar', 'Snacks', 1800, 40, 'https://images.pexels.com/photos/5664789/pexels-photo-5664789.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Galletas Oreo Original', 'Snacks', 950, 100, 'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg?auto=compress&cs=tinysrgb&w=400'],
    ['Chocolate Suizo 100g', 'Snacks', 2500, 30, 'https://images.pexels.com/photos/65882/chocolate-dark-coffee-confectionery-65882.jpeg?auto=compress&cs=tinysrgb&w=400']
];

async function main() {
    const client = await pool.connect();
    try {
        console.log("🚀 Iniciando limpieza de base de datos...");
        await client.query('BEGIN');
        await client.query("DELETE FROM productos");

        const insertText = "INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES ($1, $2, $3, $4, $5)";
        for (const p of productosMaster) {
            try {
                await client.query(insertText, p);
            } catch (err) {
                console.error("Error al insertar:", p[0], err.message);
            }
        }

        await client.query('COMMIT');
        console.log("✅ Sistema reconstruido con 22 productos de alta calidad.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("✖ Error en master_reset:", err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
