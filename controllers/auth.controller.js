const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    // PASO 1: Verificar conexión y tabla
    // Usamos `user` porque así se ve en tu foto de DBeaver
    const [users] = await pool.execute(
      'SELECT * FROM user WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado (Revisar tabla user)' });
    }

    const user = users[0];

    // PASO 2: Verificar contraseña
    // IMPORTANTE: Asegurate que en tu BD la columna sea password_hash
    // Si en tu BD la columna es 'password', cambia user.password_hash por user.password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // PASO 3: Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secreto_temporal', // Fallback por si la variable falla
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email } });

  } catch (error) {
    // ESTO ES LO QUE NECESITAMOS: Devolver el error real al Postman
    res.status(500).json({
      error: 'Error SQL o de Código',
      detalle: error.message, // <--- Esto nos dirá qué columna o tabla falta
      sqlMessage: error.sqlMessage
    });
  }
};
const register = async (req, res) => {
  try {
    const { email, password, name, lastname, tuition } = req.body;

    if (!email || !password || !name || !lastname) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.execute(
      'SELECT id FROM user WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const [result] = await pool.execute(
      'INSERT INTO user (email, password_hash, name, lastname, tuition) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, lastname, tuition]
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      'SELECT id, email, name, lastname, tuition FROM user WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log('=== ACTUALIZANDO PERFIL ===');
    const userId = req.user.id;
    const { email, tuition } = req.body;
    console.log('userId:', userId, 'email:', email, 'tuition:', tuition);

    // Verificar que el email no esté tomado por otro usuario
    console.log('Verificando email duplicado...');
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    console.log('Usuarios con email existente:', existing.length);
    if (existing.length > 0) {
      console.log('Email ya en uso');
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    console.log('Actualizando perfil...');
    await pool.execute('UPDATE users SET email = ?, tuition = ? WHERE id = ?', [email, tuition, userId]);

    console.log('Perfil actualizado correctamente');
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile
};