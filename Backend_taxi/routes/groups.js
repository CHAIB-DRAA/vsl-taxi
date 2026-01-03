const express = require('express');
const router = express.Router();
const Group = require('../models/Group');

// 👇 1. IMPORT DU MIDDLEWARE (Attention au chemin relative '../')
const authMiddleware = require('../middleware/auth'); 

// 👇 2. ACTIVATION DE LA SÉCURITÉ POUR TOUTES LES ROUTES DU FICHIER
router.use(authMiddleware); 
// À partir d'ici, 'req.user' existe obligatoirement !

// 1. CRÉER UN GROUPE
router.post('/', async (req, res) => {
  try {
    const { name, members } = req.body;
    
    // Plus besoin de vérifier si req.user existe, le middleware l'a fait
    const newGroup = new Group({
      name,
      members, 
      ownerId: req.user.userId 
    });

    const savedGroup = await newGroup.save();
    const populatedGroup = await Group.findById(savedGroup._id).populate('members');
    
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error("Erreur création groupe:", err); 
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER MES GROUPES
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ ownerId: req.user.userId }).populate('members');
    res.json(groups);
  } catch (err) {
    console.error("Erreur récupération groupes:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;