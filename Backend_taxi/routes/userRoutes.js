const express = require('express');
const router = express.Router();
const { signup, login, addContact, getUsers } = require('../controllers/userController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/', getUsers);
router.post('/addContact', addContact);

module.exports = router;
