const mysql = require('mysql2/promise');

console.log('Configuración de DB desde database.js:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : 'vacío',
  database: process.env.DB_NAME,
});

const mysql = require('mysql2/promise');

console.log('=== CONFIGURACIÓN DE DB ===');
console.log('Host:', process.env.DB_HOST);

const pool = mysql.createPool({
  // Forzamos 127.0.0.1 si DB_HOST falla, para evitar el error de IPv6 (::1)
  host: process.env.DB_HOST || '127.0.0.1', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Convertimos a número para evitar que mysql2 falle por recibir un string
  port: parseInt(process.env.DB_PORT) || 3306, 
  waitForConnections: true,
  connectionLimit: 10,  
  queueLimit: 0,
  // Agregamos un tiempo de espera para que no "crashee" el servidor si la DB tarda
  connectTimeout: 10000 
});

// Mantén tu prueba de conexión igual
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err.message);
    // IMPORTANTE: No bloqueamos el proceso, solo avisamos del error
  });

module.exports = pool;F
// Probar conexión
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err.message);
  });

module.exports = pool;