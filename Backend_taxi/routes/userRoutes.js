// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { signupUser, loginUser, getUsers, addContact } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth'); // si tu as un middleware d’auth

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/users', authMiddleware, getUsers); // ✅ route sécurisée
router.post('/addContact', authMiddleware, addContact);

// Rechercher les utilisateurs (par nom ou email)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const regex = search ? { $regex: search, $options: 'i' } : {};
    const users = await User.find({
      $or: [{ fullName: regex }, { email: regex }]
    }, '_id fullName email');

    // Optionnel : retirer l’utilisateur courant
    const filteredUsers = users.filter(u => u._id.toString() !== req.user.id);

    res.json(filteredUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
