const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { addContact, getContacts, deleteContact } = require('../controllers/contactController');

// Ajouter un contact
router.post('/contacts', authMiddleware, addContact);

// Récupérer mes contacts
router.get('/contacts', authMiddleware, getContacts);

// Supprimer un contact
router.delete('/contacts/:contactId', authMiddleware, deleteContact);

module.exports = router;
