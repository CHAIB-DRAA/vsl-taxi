const express = require('express');
const Contact = require('../models/contact');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// ---- Récupérer tous les utilisateurs (sauf soi-même)
router.get('/users', authenticateUser, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Ajouter un contact
router.post('/contacts', authenticateUser, async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId manquant' });

    const alreadyExists = await Contact.findOne({
      userId: req.user.id,
      contactId: contactId,
    });
    if (alreadyExists) return res.status(400).json({ error: 'Contact déjà ajouté' });

    const contact = await Contact.create({
      userId: req.user.id,
      contactId: contactId,
    });

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Récupérer mes contacts
router.get('/contacts', authenticateUser, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id })
      .populate('contactId', 'name email');
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
