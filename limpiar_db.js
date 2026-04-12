const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db');

db.run("DELETE FROM productos", (err) => {
    if (err) return console.error(err.message);
    console.log("✅ Tabla de productos vaciada. Espacio limpio para el nuevo inventario.");
});

db.close();