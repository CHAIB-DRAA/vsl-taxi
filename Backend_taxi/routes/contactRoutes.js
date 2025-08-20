const express = require('express');
const Contact = require('../models/contact');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// ---- Récupérer tous les utilisateurs (sauf soi-même) + option recherche par email
router.get('/users', authenticateUser, async (req, res) => {
  try {
    const { search } = req.query; // recherche par email ou nom
    const query = { _id: { $ne: req.user.id } };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('fullName email');
    res.json(users);
  } catch (err) {
    console.error('Erreur getUsers:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Ajouter un contact
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId manquant' });
    if (contactId === req.user.id) return res.status(400).json({ error: 'Impossible de s’ajouter soi-même' });

    const userExists = await User.findById(contactId);
    if (!userExists) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const alreadyExists = await Contact.findOne({ userId: req.user.id, contactId });
    if (alreadyExists) return res.status(409).json({ error: 'Contact déjà ajouté' });

    const newContact = new Contact({
      userId: req.user.id,
      contactId,
      email: userExists.email,
      fullName: userExists.fullName || '',
    });

    await newContact.save();
    res.status(201).json(newContact);
  } catch (err) {
    console.error('Erreur addContact:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Récupérer mes contacts
router.get('/', authenticateUser, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
      .populate('contactId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    console.error('Erreur getContacts:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Supprimer un contact
router.delete('/:contactId', authenticateUser, async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      userId: req.user.id,
      contactId: req.params.contactId,
    });

    if (!contact) return res.status(404).json({ error: 'Contact introuvable' });

    res.json({ message: 'Contact supprimé avec succès' });
  } catch (err) {
    console.error('Erreur deleteContact:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
