// Cargar variables de entorno. En Hostinger, priority: variables injected > .env.production > .env
const isProduction = process.env.NODE_ENV === 'production' || process.env.HOSTINGER === 'true';
if (isProduction) {
  require('dotenv').config({ path: './.env.production' });
}
require('dotenv').config({ path: './.env' }); // Fallback a .env local

// Sistema de logging a archivo para debuggear en Hostinger
const fs = require('fs');
const path = require('path');

const _startupLog = path.join(process.cwd(), 'startup.log');

function _writeStartup(msg) {
  try {
    fs.appendFileSync(_startupLog, `${new Date().toISOString()} - ${msg}\n`);
  } catch (e) {
    console.error('No se pudo escribir en startup.log:', e);
  }
}

console.log('=== index.js cargado:', new Date().toISOString());
_writeStartup('index.js cargado');

// Handlers de excepciones y rechazos no capturados
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
  _writeStartup('UNCAUGHT EXCEPTION: ' + (err && err.stack ? err.stack : String(err)));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  _writeStartup('UNHANDLED REJECTION: ' + String(reason));
});

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const patientsRoutes = require('./routes/patients.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const treatmentBudgetsRoutes = require('./routes/treatment-budgets.routes');

console.log('=== INICIANDO SERVIDOR ===');
console.log('Variables de entorno:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'vacío');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'definido' : 'NO DEFINIDO');
console.log('PORT:', process.env.PORT);

const app = express();

// Puerto: En Hostinger, usar el asignado dinámicamente. En local, defaultear a 8080
// Hostinger inyecta PORT en el proceso, así que process.env.PORT tendrá prioridad
const PORT = process.env.PORT || 8080;

console.log('=== CONFIGURACIÓN DETECTADA ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Ambiente:', isProduction ? 'PRODUCCIÓN (Hostinger)' : 'DESARROLLO');
console.log('Puerto detectado:', PORT);
console.log('DB_HOST:', process.env.DB_HOST || 'NO DEFINIDO');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'definido' : 'NO DEFINIDO');
console.log('FRONTEND_ORIGIN:', process.env.FRONTEND_ORIGIN || 'NO DEFINIDO');
console.log('BACKEND_ORIGIN:', process.env.BACKEND_ORIGIN || 'NO DEFINIDO');

// Escribir configuración inicial al log
_writeStartup(`Ambiente: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}, Puerto: ${PORT}`);
_writeStartup(`FRONTEND_ORIGIN: ${process.env.FRONTEND_ORIGIN || 'NO DEFINIDO'}`);
_writeStartup(`BACKEND_ORIGIN: ${process.env.BACKEND_ORIGIN || 'NO DEFINIDO'}`);
_writeStartup(`DB_HOST: ${process.env.DB_HOST || 'NO DEFINIDO'}`);

// Middlewares
app.use(cors({
  origin: [process.env.FRONTEND_ORIGIN, process.env.BACKEND_ORIGIN],
  credentials: true
}));
app.use(express.json());

// Registrador simple de peticiones — escribe método, ruta y parte del body a `startup.log`
app.use((req, res, next) => {
  try {
    const shortBody = req.body && Object.keys(req.body).length ? JSON.stringify(req.body).slice(0, 1000) : '';
    const msg = `${req.method} ${req.originalUrl} ${shortBody}`;
    console.log('REQ:', msg);
    _writeStartup('REQ: ' + msg);
  } catch (e) {
    console.error('Error registrando petición:', e);
  }
  next();
});

// Endpoint para revisar el `startup.log` en caso de necesitarlo. Requiere definir DEBUG_KEY en env.
if (process.env.DEBUG_KEY) {
  app.get('/internal/startup-log', (req, res) => {
    if (req.query.key !== process.env.DEBUG_KEY) return res.status(403).send('Forbidden');
    fs.readFile(_startupLog, 'utf8', (err, data) => {
      if (err) return res.status(500).send('No startup log');
      res.type('text/plain').send(data);
    });
  });
}

// Endpoint para verificar variables de entorno configuradas (sin exponer valores sensibles)
app.get('/internal/env-check', (req, res) => {
  if (req.query.key !== process.env.DEBUG_KEY) {
    return res.status(403).json({ error: 'Forbidden - define DEBUG_KEY en variables de entorno' });
  }
  res.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development',
    ambiente: isProduction ? 'PRODUCCIÓN' : 'DESARROLLO',
    puerto: PORT,
    db: {
      host: process.env.DB_HOST ? '✅ definido' : '❌ NO DEFINIDO',
      user: process.env.DB_USER ? '✅ definido' : '❌ NO DEFINIDO',
      password: process.env.DB_PASSWORD ? '✅ definido' : '❌ NO DEFINIDO',
      database: process.env.DB_NAME ? '✅ definido' : '❌ NO DEFINIDO',
      port: process.env.DB_PORT || 'NO DEFINIDO'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ? '✅ definido' : '❌ NO DEFINIDO'
    },
    cors: {
      frontendOrigin: process.env.FRONTEND_ORIGIN || '❌ NO DEFINIDO',
      backendOrigin: process.env.BACKEND_ORIGIN || '❌ NO DEFINIDO'
    },
    mensaje: 'Todos los campos con ✅ están correctamente configurados'
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/treatment-budgets', treatmentBudgetsRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando correctamente' });
});

// Manejo de errores global mejorado
app.use((err, req, res, next) => {
  try {
    const errId = Date.now().toString(36);
    const stack = err && err.stack ? err.stack : String(err);
    console.error('ERROR CRÍTICO:', stack, 'ID:', errId);
    _writeStartup(`ERROR ${errId}: ${stack}`);
    const payload = { error: 'Algo salió mal!', id: errId };
    if (process.env.NODE_ENV !== 'production') payload.stack = stack;
    res.status(500).json(payload);
  } catch (e) {
    console.error('Error manejando el error:', e);
    res.status(500).json({ error: 'Algo salió mal!' });
  }
});

// Iniciar servidor en 0.0.0.0 es fundamental en Hostinger
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo con éxito en puerto: ${PORT}`);
  _writeStartup(`Servidor escuchando en puerto ${PORT}`);
});