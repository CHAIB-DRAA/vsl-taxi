const express = require('express');
const router = express.Router();
const { signupUser, getUsers, addContact, loginUser } = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth'); 

// Créer un utilisateur (signup)
router.post('/signup', signupUser);

// Connexion utilisateur
router.post('/login', loginUser);

// Récupérer tous les utilisateurs (protégé par auth)
router.get('/users', authenticateUser, getUsers);

// Ajouter un contact (protégé par auth)
router.post('/addContact', authenticateUser, addContact);

module.exports = router;
