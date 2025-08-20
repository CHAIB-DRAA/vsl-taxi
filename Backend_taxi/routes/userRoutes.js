// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { signupUser, loginUser, getUsers, addContact } = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth'); // assure-toi que le fichier existe

// Créer un utilisateur (signup)
router.post('/signup', signupUser);

// Connexion utilisateur (login)
router.post('/login', loginUser);

// Récupérer tous les utilisateurs (authentifié)
router.get('/users', authenticateUser, getUsers);

// Ajouter un contact (authentifié)
router.post('/addContact', authenticateUser, addContact);

module.exports = router;
