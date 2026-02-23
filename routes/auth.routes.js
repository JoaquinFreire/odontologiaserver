const express = require('express');
const { login, register, getProfile, updateProfile, refreshToken } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Rutas públicas
router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refreshToken);

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;