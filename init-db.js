const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function initDatabase() {
  let connection;

  try {
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Crear base de datos si no existe
    const dbName = process.env.DB_NAME || 'consultorio_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);

    // Leer y ejecutar el archivo SQL
    const sql = fs.readFileSync('./init-db.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();