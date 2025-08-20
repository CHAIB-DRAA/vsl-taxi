const Contact = require('../models/contact');
const User = require('../models/User'); // Assure-toi que ce modèle existe et correspond à tes utilisateurs

// === Ajouter un contact ===
exports.addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.id;

    if (!contactId) {
      return res.status(400).json({ message: "L'ID du contact est requis" });
    }

    if (contactId === userId) {
      return res.status(400).json({ message: "Impossible de s'ajouter soi-même" });
    }

    // Vérifier que l'utilisateur existe bien
    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier si le contact est déjà ajouté
    const existing = await Contact.findOne({ userId, contactId });
    if (existing) {
      return res.status(409).json({ message: "Contact déjà ajouté" });
    }

    // Créer le contact à partir des infos du user
    const newContact = new Contact({
      userId,
      contactId,
      email: contactUser.email,
      fullName: contactUser.fullName || '', // si le champ existe dans User
    });

    await newContact.save();
    res.status(201).json(newContact);

  } catch (err) {
    console.error("Erreur addContact:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// === Récupérer tous les contacts d'un user ===
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
                                  .sort({ createdAt: -1 });

    res.json(contacts);
  } catch (err) {
    console.error("Erreur getContacts:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// === Supprimer un contact ===
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      userId: req.user.id,
      contactId: req.params.contactId,
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact introuvable" });
    }

    res.json({ message: "Contact supprimé avec succès" });

  } catch (err) {
    console.error("Erreur deleteContact:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
