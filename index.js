require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const patientsRoutes = require('./routes/patients.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const treatmentBudgetsRoutes = require('./routes/treatment-budgets.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const allowedOrigins = [
  'https://odontologiahi.com',
  'https://api.odontologiahi.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/treatment-budgets', treatmentBudgetsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('ERROR:', err.stack);
  res.status(500).json({ error: 'Error interno en el servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor en puerto: ${PORT}`);
});