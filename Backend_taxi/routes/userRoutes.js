const express = require('express');
const router = express.Router();
const { syncUser, getUsers, addContact } = require('../controllers/userController');

router.post('/sync', syncUser);       // Sync MongoDB après signup Supabase
router.get('/', getUsers);            // Récupérer tous les utilisateurs sauf soi
router.post('/addContact', addContact);

module.exports = router;
