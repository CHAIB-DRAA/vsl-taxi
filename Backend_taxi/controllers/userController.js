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

// Récupérer tous les utilisateurs sauf soi
exports.getUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    const users = await User.find({ _id: { $ne: userId } }, 'email fullName');
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
