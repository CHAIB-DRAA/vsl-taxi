const User = require('../models/User');


// Créer ou synchroniser un utilisateur Mongo après signup Supabase
exports.syncUser = async (req, res) => {
  try {
    const { id: supabaseId, email, fullName } = req.body;

    if (!supabaseId || !email) {
      return res.status(400).json({ error: 'supabaseId et email obligatoires' });
    }

    let user = await User.findOne({ supabaseId });

    if (!user) {
      user = new User({ supabaseId, email, fullName });
      await user.save();
    }

    res.json({ message: 'Utilisateur synchronisé', user });
  } catch (err) {
    console.error('Erreur syncUser:', err.message);
    res.status(500).json({ error: err.message });
  }
};


// Récupérer tous les utilisateurs sauf soi
exports.getUsers = async (req, res) => {
  try {
    const { supabaseId } = req.query;
    const users = await User.find({ supabaseId: { $ne: supabaseId } }, 'email fullName');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ajouter un contact
exports.addContact = async (req, res) => {
  try {
    const { userSupabaseId, contactSupabaseId } = req.body;

    const user = await User.findOne({ supabaseId: userSupabaseId });
    const contact = await User.findOne({ supabaseId: contactSupabaseId });
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
