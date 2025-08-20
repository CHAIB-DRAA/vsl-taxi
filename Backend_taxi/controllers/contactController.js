const Contact = require('../models/contact');
const User = require('../models/User');

// Ajouter un contact
exports.addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId) return res.status(400).json({ error: 'contactId manquant' });
    if (contactId === userId) return res.status(400).json({ error: 'Impossible de s’ajouter soi-même' });

    const contactUser = await User.findById(contactId);
    if (!contactUser) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const existing = await Contact.findOne({ userId, contactId });
    if (existing) return res.status(409).json({ error: 'Contact déjà ajouté' });

    const newContact = new Contact({
      userId,
      contactId,
      email: contactUser.email,
      fullName: contactUser.fullName || ''
    });

    await newContact.save();
    res.status(201).json(newContact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer tous les contacts
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
                                  .sort({ createdAt: -1 })
                                  .populate('contactId', 'fullName email');
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Supprimer un contact
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ userId: req.user.id, contactId: req.params.contactId });
    if (!contact) return res.status(404).json({ error: 'Contact introuvable' });
    res.json({ message: 'Contact supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
