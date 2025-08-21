
// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Temps d'expiration du token
const TOKEN_EXPIRATION = '7d'; // 7 jours

// Signup
exports.signupUser = async (req, res) => {
  try {
    const { email, fullName, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, fullName, password: hashedPassword });
    await user.save();

    // Générer le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    res.json({ 
      message: 'Utilisateur créé', 
      user: { id: user._id, email: user.email, fullName: user.fullName },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });

    // Générer le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    res.json({ 
      message: 'Connexion réussie', 
      user: { id: user._id, email: user.email, fullName: user.fullName },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer tous les utilisateurs
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ajouter un contact
exports.addContact = async (req, res) => {
  try {
    const { userId, contactId } = req.body;

    const user = await User.findById(userId);
    const contact = await User.findById(contactId);
    if (!user || !contact) return res.status(404).json({ message: 'Utilisateur introuvable' });

    if (!user.contacts.includes(contact._id)) {
      user.contacts.push(contact._id);
      await user.save();
    }

    res.json({ message: 'Contact ajouté', contacts: user.contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/ Nouvelle route : rechercher des utilisateurs
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const regex = search ? { $regex: search, $options: 'i' } : {};

    const users = await User.find(
      { $or: [{ fullName: regex }, { email: regex }] },
      '_id fullName email'
    );

    // Optionnel : exclure l'utilisateur courant
    const filteredUsers = users.filter(u => u._id.toString() !== req.user.id);

    res.json(filteredUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
