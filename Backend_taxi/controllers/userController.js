const User = require('../models/User');

// Créer ou synchroniser un utilisateur
exports.signup = async (req, res) => {
  try {
    const { email, fullName, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    user = new User({ email, fullName, password });
    await user.save();

    res.json({ message: 'Utilisateur créé', user });
  } catch (err) {
    console.error('Signup error:', err.message);
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
