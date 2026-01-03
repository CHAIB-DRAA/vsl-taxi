const express = require('express');
const router = express.Router();
const Group = require('../models/Group');

// 1. CRÉER UN GROUPE
router.post('/', async (req, res) => {
  try {
    const { name, members } = req.body;
    
    const newGroup = new Group({
      name,
      members, // Tableau d'IDs
      ownerId: req.user.userId // On suppose que tu as l'ID via le token d'auth
    });

    const savedGroup = await newGroup.save();
    // On renvoie le groupe peuplé pour l'affichage immédiat
    const populatedGroup = await Group.findById(savedGroup._id).populate('members');
    
    res.status(201).json(populatedGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER MES GROUPES
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ ownerId: req.user.userId }).populate('members');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
