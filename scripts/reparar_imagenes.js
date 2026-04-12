const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db');

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

db.serialize(() => {
    // Preparamos la sentencia UPDATE. Buscamos por nombre para precisión.
    const stmt = db.prepare("UPDATE productos SET imagen = ? WHERE nombre = ?");
    
    console.log("🛠️ Iniciando reparación de imágenes rotas...");

    let reparados = 0;
    
    reparaciones.forEach(prod => {
        stmt.run(prod.nuevaImagen, prod.nombre, function(err) {
            if (err) {
                console.error(`❌ Error reparando ${prod.nombre}:`, err.message);
            } else if (this.changes > 0) {
                console.log(`✅ Imagen de ${prod.nombre} reparada con éxito.`);
            } else {
                console.warn(`⚠️ No se encontró el producto ${prod.nombre} para reparar.`);
            }
        });
    });
    
    stmt.finalize();
});

db.close(() => {
    console.log("✨ Proceso de reparación finalizado. Limpia la caché y recarga la web.");
});