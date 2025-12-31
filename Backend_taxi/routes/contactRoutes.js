const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { addContact, getContacts, deleteContact } = require('../controllers/contactController');

// Ajouter un contact
router.post('/', authMiddleware, addContact);
// Récupérer mes contacts
router.get('/', authMiddleware, getContacts);

// Supprimer un contact
router.delete('/:contactId', authMiddleware, deleteContact);

module.exports = router;
