// ⚠️ LOGGING MUY TEMPRANO - antes de cualquier require que pueda fallar
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

// Escribir INMEDIATAMENTE para verificar que index.js se ejecuta
_writeStartup('========== INICIANDO APP ==========');
_writeStartup(`Timestamp: ${new Date().toISOString()}`);
_writeStartup(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
_writeStartup(`CWD: ${process.cwd()}`);
_writeStartup(`Cargando variables de entorno...`);

// Cargar variables de entorno. En Hostinger, priority: variables injected > .env.production > .env
const isProduction = process.env.NODE_ENV === 'production' || process.env.HOSTINGER === 'true';
_writeStartup(`isProduction: ${isProduction}`);

try {
  if (isProduction) {
    _writeStartup('Leyendo .env.production...');
    require('dotenv').config({ path: './.env.production' });
  }
  _writeStartup('Leyendo .env...');
  require('dotenv').config({ path: './.env' }); // Fallback a .env local
  _writeStartup('Variables de entorno cargadas exitosamente');
} catch (err) {
  _writeStartup('ERROR cargando variables de entorno: ' + String(err));
  console.error('ERROR en dotenv:', err);
}

_writeStartup(`DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
_writeStartup(`DB_USER: ${process.env.DB_USER || 'undefined'}`);
_writeStartup(`DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
_writeStartup(`JWT_SECRET: ${process.env.JWT_SECRET ? 'defined' : 'undefined'}`);
_writeStartup(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

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

_writeStartup('Loading routes...');

let authRoutes, patientsRoutes, appointmentsRoutes, treatmentBudgetsRoutes;

try {
  authRoutes = require('./routes/auth.routes');
  _writeStartup('✅ authRoutes loaded');
} catch (err) {
  _writeStartup('❌ ERROR loading authRoutes: ' + String(err));
  console.error('Error loading authRoutes:', err);
}

try {
  patientsRoutes = require('./routes/patients.routes');
  _writeStartup('✅ patientsRoutes loaded');
} catch (err) {
  _writeStartup('❌ ERROR loading patientsRoutes: ' + String(err));
  console.error('Error loading patientsRoutes:', err);
}

try {
  appointmentsRoutes = require('./routes/appointments.routes');
  _writeStartup('✅ appointmentsRoutes loaded');
} catch (err) {
  _writeStartup('❌ ERROR loading appointmentsRoutes: ' + String(err));
  console.error('Error loading appointmentsRoutes:', err);
}

try {
  treatmentBudgetsRoutes = require('./routes/treatment-budgets.routes');
  _writeStartup('✅ treatmentBudgetsRoutes loaded');
} catch (err) {
  _writeStartup('❌ ERROR loading treatmentBudgetsRoutes: ' + String(err));
  console.error('Error loading treatmentBudgetsRoutes:', err);
}

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
try {
  app.use(cors({
    origin: [process.env.FRONTEND_ORIGIN, process.env.BACKEND_ORIGIN],
    credentials: true
  }));
  _writeStartup('✅ CORS configured');
} catch (err) {
  _writeStartup('❌ ERROR configuring CORS: ' + String(err));
  console.error('Error configuring CORS:', err);
}

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

// ENDPOINT DEBUG TEMPORAL (sin autenticación, para diagnóstico)
// TODO: ELIMINAR ANTES DE PRODUCCIÓN FINAL
app.get('/internal/debug-info', (req, res) => {
  _writeStartup('DEBUG: /internal/debug-info fue llamado');
  const pool = require('./config/database'); // Test connection
  
  res.json({
    timestamp: new Date().toISOString(),
    info: '⚠️ ENDPOINT DEBUG TEMPORAL - ELIMINAR ANTES DE PRODUCCIÓN',
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      PORT: PORT,
      isProduction: isProduction,
      DB_HOST: process.env.DB_HOST || 'undefined',
      DB_USER: process.env.DB_USER || 'undefined',
      DB_NAME: process.env.DB_NAME || 'undefined',
      DB_PORT: process.env.DB_PORT || 'undefined',
      JWT_SECRET_DEFINED: !!process.env.JWT_SECRET,
      DEBUG_KEY_DEFINED: !!process.env.DEBUG_KEY,
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'undefined',
      BACKEND_ORIGIN: process.env.BACKEND_ORIGIN || 'undefined'
    }
  });
});

// ENDPOINT PARA VER ERROR ESPECÍFICO POR ID (sin autenticación, temporal para debug)
app.get('/internal/error-log/:id', (req, res) => {
  const errorId = req.params.id;
  _writeStartup(`DEBUG: /internal/error-log/${errorId} fue llamado`);
  
  fs.readFile(_startupLog, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo leer el log', details: err.message });
    }
    
    const lines = data.split('\n');
    const errorLines = lines.filter(line => line.includes(`ERROR ${errorId}:`) || line.includes(`AUTH: ...`) && line.includes(errorId));
    
    if (errorLines.length === 0) {
      return res.status(404).json({ error: `No se encontró error con ID: ${errorId}`, searchedId: errorId });
    }
    
    res.json({
      id: errorId,
      errors: errorLines,
      info: '⚠️ Este endpoint es temporal para debugging. Eliminar antes de producción.'
    });
  });
});

// Rutas
try {
  if (authRoutes) app.use('/api/auth', authRoutes);
  if (patientsRoutes) app.use('/api/patients', patientsRoutes);
  if (appointmentsRoutes) app.use('/api/appointments', appointmentsRoutes);
  if (treatmentBudgetsRoutes) app.use('/api/treatment-budgets', treatmentBudgetsRoutes);
  _writeStartup('✅ All routes registered');
} catch (err) {
  _writeStartup('❌ ERROR registering routes: ' + String(err));
  console.error('Error registering routes:', err);
}

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
_writeStartup(`Intentando iniciar servidor en puerto ${PORT}...`);

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const msg = `✅ Servidor corriendo con éxito en puerto: ${PORT}`;
    console.log(msg);
    _writeStartup(msg);
    _writeStartup('========== SERVIDOR LISTO ==========');
  });
  
  server.on('error', (err) => {
    _writeStartup('❌ SERVER ERROR: ' + String(err));
    console.error('Server error:', err);
  });
} catch (err) {
  _writeStartup('❌ ERROR iniciando servidor: ' + String(err));
  console.error('Error starting server:', err);
  process.exit(1);
}