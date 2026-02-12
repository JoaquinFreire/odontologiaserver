const express = require('express');
const cors = require('cors');

// Importamos solo lo básico para que no falle si hay error en otros archivos
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://odontologiahi.com', 'https://api.odontologiahi.com'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);

// La ruta que nos daba esperanza
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API revivida',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en puerto: ${PORT}`);
});