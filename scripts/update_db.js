const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./minimarket.db');

const stockManual = [
    // --- FRUTAS Y VERDURAS ---
    ['Plátano Granel (1kg)', 'Verduras', 1500, 40, 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400'],
    ['Manzana Roja Premium', 'Verduras', 1800, 35, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?w=400'],
    ['Papas Primor (1kg)', 'Verduras', 1100, 100, 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?w=400'],
    
    // --- ABARROTES (NUEVO) ---
    ['Arroz Grano Largo 1kg', 'Abarrotes', 1450, 50, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'],
    ['Fideos Espagueti 400g', 'Abarrotes', 890, 60, 'https://images.unsplash.com/photo-1551462147-37885acc3c41?w=400'],
    ['Aceite de Maravilla 1L', 'Abarrotes', 2800, 20, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400'],
    
    // --- LÁCTEOS Y DESAYUNO ---
    ['Leche Entera 1L', 'Lácteos', 1100, 45, 'https://images.unsplash.com/photo-1550583724-1255d1426639?w=400'],
    ['Yogurt de Frutilla', 'Lácteos', 450, 80, 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400'],
    ['Pan de Molde Familiar', 'Panadería', 2400, 15, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'],
    
    // --- LIMPIEZA (NUEVO) ---
    ['Lavalozas Limón 750ml', 'Limpieza', 1850, 25, 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?w=400'],
    
    // --- BEBIDAS Y SNACKS ---
    ['Bebida Coca-Cola 1.5L', 'Bebidas', 1900, 30, 'https://images.unsplash.com/photo-1622708782596-13d974444453?w=400'],
    ['Papas Fritas XL', 'Snacks', 1600, 40, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400']
];

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO productos (nombre, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)");
    stockManual.forEach(p => stmt.run(p));
    stmt.finalize();
    console.log("✅ Gran Inventario Jireth cargado sin duplicados.");
});
db.close();