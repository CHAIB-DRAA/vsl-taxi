const express = require('express');
const router = express.Router();
const { signupUser, getUsers, addContact } = require('../controllers/userController');

// Créer un utilisateur (signup)
router.post('/signup', signupUser);

// Connexion utilisateur
router.post('/login', loginUser);

// Récupérer tous les utilisateurs
router.get('/', getUsers);

// Ajouter un contact
router.post('/addContact', addContact);

module.exports = router;
