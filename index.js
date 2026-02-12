// Eliminamos require('dotenv').config() porque Hostinger inyecta las variables desde el panel
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

// El puerto debe ser dinámico. Hostinger lo asigna solo.
const PORT = process.env.PORT || 3000;

// Configuración de CORS estricta para producción
app.use(cors({
  origin: [
    'https://odontologiahi.com', 
    'https://api.odontologiahi.com'
  ],
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