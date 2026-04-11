const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db');

db.serialize(() => {
    // 1. Crear tabla de usuarios
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nombre TEXT, email TEXT UNIQUE, password TEXT)");
    console.log("Tabla de usuarios creada.");

    // 2. Crear tabla de productos
    db.run("CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, nombre TEXT, precio INTEGER, imagen TEXT, categoria TEXT, stock INTEGER)");

    // 3. Insertar productos de prueba
    const stmt = db.prepare("INSERT INTO productos (nombre, precio, imagen, categoria, stock) VALUES (?, ?, ?, ?, ?)");
    
    stmt.run("Arroz Grado 1 (1kg)", 1200, "https://via.placeholder.com/150", "Abarrotes", 50);
    stmt.run("Leche Entera 1L", 1050, "https://via.placeholder.com/150", "Lácteos", 30);
    stmt.run("Aceite Vegetal 900ml", 2500, "https://via.placeholder.com/150", "Abarrotes", 20);
    stmt.run("Detergente Multiuso", 4500, "https://via.placeholder.com/150", "Limpieza", 15);
    stmt.run("Pack de Yogur (4u)", 1800, "https://via.placeholder.com/150", "Lácteos", 25);
    
    stmt.finalize();
    console.log("¡Base de datos del Minimarket lista y surtida!");
});

db.close();