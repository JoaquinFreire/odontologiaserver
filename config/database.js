const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306, 
  waitForConnections: true,
  connectionLimit: 10,  
  queueLimit: 0,
  connectTimeout: 10000 
});

pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err.message);
  });

module.exports = pool;