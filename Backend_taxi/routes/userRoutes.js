const express = require('express');
const router = express.Router();
const { syncUser, getUsers, addContact } = require('../controllers/userController');

// Synchroniser l'utilisateur Mongo après login Supabase
router.post('/sync', syncUser);

// Récupérer tous les utilisateurs
router.get('/', getUsers);

// Ajouter un contact
router.post('/addContact', addContact);

module.exports = router;
