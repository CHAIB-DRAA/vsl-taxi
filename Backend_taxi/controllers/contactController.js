const Contact = require('../models/contact');
const User = require('../models/User');

// -----------------------------
// Ajouter un contact
// -----------------------------
exports.addContact = async (req, res) => {
  try {
    const userId = req.user?._id?.toString(); // sécurisation
    const { contactId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié' });
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
    console.log(`✅ Contact ajouté pour userId=${userId} : contactId=${contactId}`);
    res.status(201).json(newContact);

  } catch (err) {
    console.error('❌ Erreur addContact :', err);
    res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
};

// -----------------------------
// Récupérer tous les contacts
// -----------------------------
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié' });

    console.log('📥 Récupération contacts pour userId =', userId);
    const contacts = await Contact.find({ userId })
                                  .sort({ createdAt: -1 })
                                  .populate('contactId', 'fullName email'); // assure-toi que ref: 'User' est correct dans le modèle

    console.log('📤 Contacts trouvés :', contacts.length);
    res.json(contacts);

  } catch (err) {
    console.error('❌ Erreur getContacts :', err);
    res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
};

// -----------------------------
// Supprimer un contact
// -----------------------------
exports.deleteContact = async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    const contactId = req.params.contactId;

    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié' });

    const contact = await Contact.findOneAndDelete({ userId, contactId });
    if (!contact) return res.status(404).json({ error: 'Contact introuvable' });

    console.log(`🗑️ Contact supprimé pour userId=${userId} : contactId=${contactId}`);
    res.json({ message: 'Contact supprimé avec succès' });

  } catch (err) {
    console.error('❌ Erreur deleteContact :', err);
    res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
};
