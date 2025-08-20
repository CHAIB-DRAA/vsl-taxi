// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { signupUser, loginUser, getUsers, addContact } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth'); // ✅ à importer

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/users', authMiddleware, getUsers); // ✅ route sécurisée
router.post('/addContact', authMiddleware, addContact);

module.exports = router;
