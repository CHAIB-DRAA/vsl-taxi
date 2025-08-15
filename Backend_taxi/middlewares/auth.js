const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Route inscription
router.post('/register', registerUser);

// Route connexion
router.post('/login', loginUser);

module.exports = router;
