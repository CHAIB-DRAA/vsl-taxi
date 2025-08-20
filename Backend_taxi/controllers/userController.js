const User = require('../models/User');
const bcrypt = require('bcrypt');

// Créer un utilisateur (signup)
exports.signupUser = async (req, res) => {
  try {
    const { email, fullName, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    // Vérifier si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'Email déjà utilisé' });

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({ email, fullName, password: hashedPassword });
    await user.save();

    res.json({ message: 'Utilisateur créé avec succès', user: { id: user._id, email: user.email, fullName: user.fullName } });
  } catch (err) {
    console.error('signupUser error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
