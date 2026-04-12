const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db');

const nuevosProductos = [
    // --- VERDURAS ---
    ['Tomate Larga Vida (1kg)', 'Verduras', 1800, 50, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400'],
    ['Lechuga Escarola Fresca', 'Verduras', 1200, 30, 'https://images.unsplash.com/photo-1622206141540-581302511033?q=80&w=400'],
    ['Papas Primor (1kg)', 'Verduras', 1100, 100, 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?q=80&w=400'],
    
    // --- LÁCTEOS ---
    ['Yogurt Batido Frutilla 120g', 'Lácteos', 450, 40, 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?q=80&w=400'],
    ['Leche Entera Colun 1L', 'Lácteos', 1150, 60, 'https://images.unsplash.com/photo-1550583724-1255d1426639?q=80&w=400'],
    
    // --- DULCES ---
    ['Alfajor Chocolate Premium', 'Dulces', 800, 100, 'https://images.unsplash.com/photo-1605807646983-377bc5a76493?q=80&w=400'],
    ['Gomitas Frutales 100g', 'Dulces', 950, 80, 'https://images.unsplash.com/photo-1582041236130-1fd70ff6aa9b?q=80&w=400'],
    ['Chocolate Suizo 70% Cacao', 'Dulces', 2500, 30, 'https://images.unsplash.com/photo-1511381939415-e44015466834?q=80&w=400'],
    
    // --- BEBIDAS ---
    ['Coca-Cola Original 3L', 'Bebidas', 2900, 24, 'https://images.unsplash.com/photo-1622708782596-13d974444453?q=80&w=400'],
    ['Sprite Lima-Limón 1.5L', 'Bebidas', 1800, 30, 'https://images.unsplash.com/photo-1625772290748-39093c022a2e?q=80&w=400'],
    ['Jugo Naranja Natural 1L', 'Bebidagit s', 1500, 45, 'https://images.unsplash.com/photo-1600271886342-dc672e273f59?q=80&w=400']
];

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)");
    
    nuevosProductos.forEach(prod => {
        stmt.run(prod);
    });
    
    stmt.finalize();
    console.log("✅ Inventario expandido con éxito.");
});

db.close();