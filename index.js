// Cargar variables de entorno localmente. Hostinger inyecta sus propias vars en producción,
// pero `dotenv` no interfiere si las variables ya están definidas.
require('dotenv').config();
// Nota: mantener `dotenv` permite pruebas locales con un archivo .env
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
console.log('Variables de entorno detectadas:');
console.log('DB_HOST:', process.env.DB_HOST || 'No definido');
console.log('DB_NAME:', process.env.DB_NAME || 'No definido');
console.log('PORT asignado por Hostinger:', process.env.PORT);

const app = express();

// El puerto debe ser dinámico. Hostinger lo asigna.
const PORT = process.env.PORT || 3000;

// Configuración de CORS: en desarrollo aceptar cualquier origen, en producción restringir.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://odontologiahi.com',
      'https://api.odontologiahi.com'
    ]
  : true;

app.use(cors({
  origin: allowedOrigins,
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

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/treatment-budgets', treatmentBudgetsRoutes);

// Ruta de salud para probar si el servidor responde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API funcionando correctamente en Hostinger',
    timestamp: new Date().toISOString()
  });
});


// Manejador de errores global
app.use((err, req, res, next) => {
  try {
    const errId = Date.now().toString(36);
    const stack = err && err.stack ? err.stack : String(err);
    console.error('ERROR CRÍTICO:', stack, 'ID:', errId);
    _writeStartup(`ERROR ${errId}: ${stack}`);
    const payload = { error: 'Error interno en el servidor', id: errId };
    if (process.env.NODE_ENV !== 'production') payload.stack = stack;
    res.status(500).json(payload);
  } catch (e) {
    console.error('Error manejando el error:', e);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

// Iniciar servidor en 0.0.0.0 es fundamental en Hostinger
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo con éxito en puerto: ${PORT}`);
});