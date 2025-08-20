// routes/userRoutes.js
const express = require('express');
const { signupUser, loginUser, getUsers } = require('../controllers/userController');
const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/', getUsers);

module.exports = router;
