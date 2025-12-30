const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware'); // Important pour savoir qui est le chauffeur

// Toutes les routes sont protégées par le login (authMiddleware)
router.use(authMiddleware);

router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);

module.exports = router;