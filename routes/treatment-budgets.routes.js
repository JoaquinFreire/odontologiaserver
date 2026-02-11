const express = require('express');
const {
  getTreatmentBudgets,
  getTreatmentBudget,
  createTreatmentBudget,
  updateTreatmentBudget,
  deleteTreatmentBudget
} = require('../controllers/treatment-budget.controller');
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment
} = require('../controllers/payments.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para presupuestos de tratamiento
// GET /api/treatment-budgets/:patientId - Obtener todos los presupuestos de un paciente
router.get('/:patientId', getTreatmentBudgets);

// GET /api/treatment-budgets/:patientId/:budgetId - Obtener un presupuesto específico
router.get('/:patientId/:budgetId', getTreatmentBudget);

// POST /api/treatment-budgets/:patientId - Crear nuevo presupuesto
router.post('/:patientId', createTreatmentBudget);

// PUT /api/treatment-budgets/:patientId/:budgetId - Actualizar presupuesto
router.put('/:patientId/:budgetId', updateTreatmentBudget);

// DELETE /api/treatment-budgets/:patientId/:budgetId - Eliminar presupuesto
router.delete('/:patientId/:budgetId', deleteTreatmentBudget);

// Rutas para pagos
// GET /api/treatment-budgets/:patientId/:budgetId/payments - Obtener todos los pagos de un presupuesto
router.get('/:patientId/:budgetId/payments', getPayments);

// GET /api/treatment-budgets/:patientId/:budgetId/payments/:paymentId - Obtener un pago específico
router.get('/:patientId/:budgetId/payments/:paymentId', getPayment);

// POST /api/treatment-budgets/:patientId/:budgetId/payments - Crear nuevo pago
router.post('/:patientId/:budgetId/payments', createPayment);

// PUT /api/treatment-budgets/:patientId/:budgetId/payments/:paymentId - Actualizar pago
router.put('/:patientId/:budgetId/payments/:paymentId', updatePayment);

// DELETE /api/treatment-budgets/:patientId/:budgetId/payments/:paymentId - Eliminar pago
router.delete('/:patientId/:budgetId/payments/:paymentId', deletePayment);

module.exports = router;
