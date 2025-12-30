const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes sont protégées par le login (authMiddleware)
router.use(authMiddleware);

router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);

router.put('/:id', patientController.updatePatient);   
router.delete('/:id', patientController.deletePatient);

module.exports = router;