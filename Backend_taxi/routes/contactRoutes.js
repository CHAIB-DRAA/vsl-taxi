const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const { addContact, getContacts, deleteContact } = require('../controllers/contactController');

// Ajouter un contact
router.post('/contacts', authenticateUser, addContact);

// Récupérer mes contacts
router.get('/contacts', authenticateUser, getContacts);

// Supprimer un contact
router.delete('/contacts/:contactId', authenticateUser, deleteContact);

module.exports = router;
