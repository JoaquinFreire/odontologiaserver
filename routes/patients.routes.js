const express = require('express');
const {
  getAllPatients,
  getPatient,
  savePatient,
  updatePatient,
  getPatientWithAnamnesis,
  updatePatientAnamnesis,
  saveCompletePatient,
  getPatientConsent,
  updatePatientConsent,
  getPatientTreatments,
  updatePatientTreatments,
  getPatientOdontograma,
  updatePatientOdontograma,
  getOdontogramaVersions,
  getOdontogramaByVersion
} = require('../controllers/patients.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de pacientes
router.get('/', getAllPatients);
router.post('/', savePatient);
router.get('/:id', getPatient);
router.put('/:id', updatePatient);
router.get('/:id/anamnesis', getPatientWithAnamnesis);
router.put('/:id/anamnesis', updatePatientAnamnesis);
router.post('/complete', saveCompletePatient);

// Nuevas rutas para historial clínico
router.get('/:id/consent', getPatientConsent);
router.put('/:id/consent', updatePatientConsent);
router.get('/:id/treatments', getPatientTreatments);
router.put('/:id/treatments', updatePatientTreatments);
router.get('/:id/odontograma', getPatientOdontograma);
router.put('/:id/odontograma', updatePatientOdontograma);
router.get('/:id/odontograma/versions', getOdontogramaVersions);
router.get('/:id/odontograma/:version', getOdontogramaByVersion);

// Agregar más rutas según sea necesario...

module.exports = router;