const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

// Para logging
const _startupLog = path.join(process.cwd(), 'startup.log');
function _writeLog(msg) {
  try {
    fs.appendFileSync(_startupLog, `AUTH: ${new Date().toISOString()} - ${msg}\n`);
  } catch (e) {
    console.error('Error escribiendo log:', e);
  }
}

const login = async (req, res) => {
  const errId = Date.now().toString(36);
  try {
    console.log('=== INICIANDO LOGIN ===');
    _writeLog(`LOGIN attempt, errId: ${errId}`);
    const { email, password } = req.body;
    console.log('Email recibido:', email);
    _writeLog(`Email: ${email}`);

    if (!email || !password) {
      _writeLog(`Missing email or password`);
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario por email
    console.log('Ejecutando consulta SQL...');
    _writeLog(`Executing query for email: ${email}`);
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, name, lastname, tuition FROM user WHERE email = ?',
      [email]
    );
    console.log('Resultado de consulta:', users);
    _writeLog(`Query result: ${users.length} user(s) found`);

    if (users.length === 0) {
      console.log('Usuario no encontrado');
      _writeLog(`User not found for email: ${email}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    console.log('Usuario encontrado:', { id: user.id, email: user.email });
    _writeLog(`User found: id=${user.id}, email=${user.email}`);

    // Verificar contraseña
    console.log('Verificando contraseña...');
    _writeLog(`Comparing password...`);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Contraseña válida:', isValidPassword);
    _writeLog(`Password valid: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log('Contraseña incorrecta');
      _writeLog(`Invalid password for user ${user.email}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT
    console.log('Generando JWT...');
    _writeLog(`Generating JWT...`);
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('JWT generado correctamente');
    _writeLog(`JWT generated successfully`);

    // Remover password del response
    delete user.password_hash;
    delete user.password;

    console.log('Login exitoso para:', user.email);
    _writeLog(`Login successful for: ${user.email}`);
    res.json({
      user,
      token
    });
  } catch (error) {
    const errId = Date.now().toString(36);
    console.error('Error en login:', error);
    console.error('Stack trace:', error.stack);
    _writeLog(`ERROR ${errId}: ${error.message}`);
    _writeLog(`Stack: ${error.stack}`);
    res.status(500).json({ error: 'Error interno del servidor', id: errId });
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
    const { email, name, lastname, tuition } = req.body;
    console.log('userId:', userId, 'email:', email, 'name:', name, 'lastname:', lastname, 'tuition:', tuition);

    // Verificar que el email no esté tomado por otro usuario
    console.log('Verificando email duplicado...');
    const [existing] = await pool.execute('SELECT id FROM user WHERE email = ? AND id != ?', [email, userId]);
    console.log('Usuarios con email existente:', existing.length);
    if (existing.length > 0) {
      console.log('Email ya en uso');
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    console.log('Actualizando perfil...');
    await pool.execute('UPDATE user SET email = ?, name = ?, lastname = ?, tuition = ? WHERE id = ?', [email, name, lastname, tuition, userId]);

    console.log('Perfil actualizado correctamente');
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
const refreshToken = async (req, res) => {
  try {
    console.log('=== REFRESH TOKEN ===');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token expirado, intenta decodificarlo sin verificar
      decoded = jwt.decode(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
    }

    // Generar nuevo token
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
};
module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  refreshToken
};