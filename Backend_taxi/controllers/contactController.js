const Contact = require('../models/contact');

// === Ajouter un contact ===
exports.addContact = async (req, res) => {
  try {
    const { contactId, email, fullName } = req.body;
    const userId = req.user.id;

    if (!contactId || !email) return res.status(400).json({ message: "Champs manquants" });
    if (contactId === userId) return res.status(400).json({ message: "Impossible de s'ajouter soi-même" });

    const existing = await Contact.findOne({ userId, contactId });
    if (existing) return res.status(409).json({ message: "Contact déjà ajouté" });

    const newContact = new Contact({ userId, contactId, email, fullName });
    await newContact.save();

    res.status(201).json(newContact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// === Récupérer tous les contacts ===
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// === Supprimer un contact ===
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ userId: req.user.id, contactId: req.params.contactId });
    if (!contact) return res.status(404).json({ message: "Contact introuvable" });
    res.json({ message: "Contact supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
