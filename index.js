const express = require('express');
const cors = require('cors');

// Importante: Revisa que estas rutas existan en tus carpetas
const authRoutes = require('./routes/auth.routes');
const patientsRoutes = require('./routes/patients.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://odontologiahi.com', 'https://api.odontologiahi.com'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor revivido' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});