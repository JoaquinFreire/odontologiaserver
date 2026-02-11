const pool = require('./config/database');

async function testConnection() {
  try {
    console.log('Probando conexión a la base de datos...');

    // Probar conexión básica
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa');

    // Ver qué bases de datos existen
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('Bases de datos disponibles:', databases.map(db => db.Database));

    // Usar la base de datos especificada
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Ver qué tablas existen
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tablas en la base de datos:', tables.map(t => Object.values(t)[0]));

    // Si existe la tabla user, ver su estructura
    const [userTables] = await connection.query("SHOW TABLES LIKE 'user'");
    if (userTables.length > 0) {
      console.log('Estructura de la tabla user:');
      const [columns] = await connection.query('DESCRIBE user');
      console.log(columns);

      // Ver contenido de la tabla user
      const [users] = await connection.query('SELECT id, email, name, lastname, tuition FROM user LIMIT 5');
      console.log('Contenido de la tabla user:', users);
    } else {
      console.log('❌ La tabla "user" no existe');
    }

    connection.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit();
  }
}

testConnection();