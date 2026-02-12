const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const login = async (req, res) => {
  try {
    console.log('=== INICIANDO LOGIN ===');
    const { email, password } = req.body;
    console.log('Email recibido:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario por email
    console.log('Ejecutando consulta SQL...');
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, name, lastname, tuition FROM user WHERE email = ?',
      [email]
    );
    console.log('Resultado de consulta:', users);

    if (users.length === 0) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    console.log('Usuario encontrado:', { id: user.id, email: user.email });

    // Verificar contraseña
    console.log('Verificando contraseña...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Contraseña válida:', isValidPassword);

    if (!isValidPassword) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT
    console.log('Generando JWT...');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('JWT generado correctamente');

    // Remover password del response
    delete user.password;

    console.log('Login exitoso para:', user.email);
    res.json({
      user,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
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