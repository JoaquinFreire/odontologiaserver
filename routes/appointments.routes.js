const express = require('express');
const {
  getTodayAppointments,
  getOverdueAppointments,
  getTotalPendingAppointments,
  markAppointmentAsCompleted,
  createAppointment,
  getAllPendingAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointments.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de citas
router.get('/today', getTodayAppointments);
router.get('/overdue', getOverdueAppointments);
router.get('/pending/total', getTotalPendingAppointments);
router.get('/pending', getAllPendingAppointments);
router.post('/', createAppointment);
router.get('/:id', getAppointmentById);
router.put('/:id', updateAppointment);
router.put('/:id/complete', markAppointmentAsCompleted);
router.delete('/:id', deleteAppointment);

module.exports = router;