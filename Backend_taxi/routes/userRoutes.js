const express = require('express');
const router = express.Router();
const { signupUser, loginUser, getUsers, addContact } = require('../controllers/userController');

// Signup
router.post('/signup', signupUser);

// Login
router.post('/login', loginUser);

// Récupérer tous les utilisateurs
router.get('/', getUsers);

// Ajouter un contact
router.post('/addContact', addContact);

module.exports = router;
