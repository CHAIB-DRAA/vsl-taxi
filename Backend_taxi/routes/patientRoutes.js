const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes sont protégées par le login (authMiddleware)
router.use(authMiddleware);

router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);

module.exports = router;