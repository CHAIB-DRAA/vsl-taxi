const express = require('express');
const router = express.Router();
const { signup, getUsers, addContact } = require('../controllers/userController');

// Créer un utilisateur
router.post('/signup', signup);

// Récupérer tous les utilisateurs sauf soi
router.get('/', getUsers);

// Ajouter un contact
router.post('/addContact', addContact);

module.exports = router;
