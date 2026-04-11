const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db'); // Cambiamos el nombre de la DB

db.serialize(() => {
    // Creamos la tabla con 'stock' para darle más nivel al proyecto
    db.run("CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, nombre TEXT, precio INTEGER, imagen TEXT, categoria TEXT, stock INTEGER)");

    const stmt = db.prepare("INSERT INTO productos (nombre, precio, imagen, categoria, stock) VALUES (?, ?, ?, ?, ?)");
    
    // Productos típicos de Minimarket
    stmt.run("Arroz Grado 1 (1kg)", 1200, "https://via.placeholder.com/150", "Abarrotes", 50);
    stmt.run("Leche Entera 1L", 1050, "https://via.placeholder.com/150", "Lácteos", 30);
    stmt.run("Aceite Vegetal 900ml", 2500, "https://via.placeholder.com/150", "Abarrotes", 20);
    stmt.run("Detergente Multiuso", 4500, "https://via.placeholder.com/150", "Limpieza", 15);
    stmt.run("Pack de Yogur (4u)", 1800, "https://via.placeholder.com/150", "Lácteos", 25);
    
    stmt.finalize();
    console.log("¡Base de datos del Minimarket lista y surtida!");
});
db.close();