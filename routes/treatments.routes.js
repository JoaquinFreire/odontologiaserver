const express = require('express');
const router = express.Router();
const treatmentsCtrl = require('../controllers/treatments.controller');

router.get('/', treatmentsCtrl.getTreatments);
router.post('/', treatmentsCtrl.addTreatment);
router.delete('/', treatmentsCtrl.removeTreatment);

module.exports = router;
