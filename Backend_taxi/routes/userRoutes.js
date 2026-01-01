// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    signupUser, 
    loginUser, 
    getUsers, 
    addContact, 
    searchUsers,
    getProfile,    // <--- AJOUTÉ
    updateProfile  // <--- AJOUTÉ
  } = require('../controllers/userController');const authMiddleware = require('../middleware/auth'); // si tu as un middleware d’auth

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/users', authMiddleware, getUsers); // ✅ route sécurisée
router.post('/addContact', authMiddleware, addContact);

router.get('/search', authMiddleware, searchUsers); // <- ici on appelle la fonction du controller


router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
