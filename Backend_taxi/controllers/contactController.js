const Contact = require('../models/contact');
const User = require('../models/User');

// 1. Rechercher un utilisateur (pour l'ajouter)
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) return res.json([]);

    // On cherche par email ou nom (insensible à la casse)
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('fullName email _id') // On ne renvoie pas le mot de passe !
    .limit(10);

    // On exclut l'utilisateur lui-même des résultats
    const filtered = users.filter(u => String(u._id) !== req.user.id);

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Ajouter un contact
exports.addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    // 1. On vérifie qu'on ne s'ajoute pas soi-même
    if (contactId === userId) {
      return res.status(400).json({ message: "Vous ne pouvez pas vous ajouter." });
    }

    // 2. On vérifie si le contact existe déjà
    const existing = await Contact.findOne({ userId, contactId });
    if (existing) {
      return res.status(400).json({ message: "Ce contact est déjà dans votre liste." });
    }

    // 3. On crée le lien
    const newContact = new Contact({
      userId,
      contactId
    });

    await newContact.save();
    res.status(201).json(newContact);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 3. Récupérer ma liste de contacts
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
      .populate('contactId', 'fullName email'); // On remplace l'ID par les vrais infos (Nom, Email)
    
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Supprimer un contact
exports.deleteContact = async (req, res) => {
  try {
    await Contact.findOneAndDelete({ userId: req.user.id, _id: req.params.id });
    res.json({ message: "Contact supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};