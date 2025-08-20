// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { signupUser, loginUser, getUsers, addContact } = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth'); // ✅ à importer

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/users', authenticateUser, getUsers); // ✅ route sécurisée
router.post('/addContact', authenticateUser, addContact);

module.exports = router;
