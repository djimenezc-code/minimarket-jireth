// db.js
const mysql = require('mysql2');

// Crear la conexión (credenciales por defecto de XAMPP)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',      // Usuario por defecto en XAMPP
  password: '',      // Contraseña por defecto en XAMPP (vacía)
  database: 'minimarket_jireth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify para poder usar async/await en tus rutas
const promisePool = pool.promise();

module.exports = promisePool;