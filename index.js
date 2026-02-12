// Cargar variables de entorno localmente. Hostinger inyecta sus propias vars en producción,
// pero `dotenv` no interfiere si las variables ya están definidas.
require('dotenv').config();
// Nota: mantener `dotenv` permite pruebas locales con un archivo .env
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
  console.error('ERROR CRÍTICO:', err.stack);
  res.status(500).json({ error: 'Error interno en el servidor' });
});

// Iniciar servidor en 0.0.0.0 es fundamental en Hostinger
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo con éxito en puerto: ${PORT}`);
});