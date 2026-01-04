const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth'); 

router.use(authMiddleware); 

// 1. CRÉER UN GROUPE
router.post('/', async (req, res) => {
  console.log("👥 Tentative de création de groupe...");
  console.log("📦 Données reçues:", req.body);
  console.log("👤 Utilisateur connecté:", req.user);

  try {
    const { name, members } = req.body;
    
    // 👇 CORRECTION ICI (Le piège du userId vs id)
    const myOwnerId = req.user.id || req.user.userId;

    if (!myOwnerId) {
        console.error("❌ Erreur: Impossible de trouver l'ID du créateur dans le token.");
        return res.status(401).json({ error: "Identité introuvable." });
    }

    const newGroup = new Group({
      name,
      members, 
      ownerId: myOwnerId // ✅ On utilise la variable sécurisée
    });

    const savedGroup = await newGroup.save();
    console.log("✅ Groupe créé en BDD avec l'ID:", savedGroup._id);

    const populatedGroup = await Group.findById(savedGroup._id).populate('members');
    
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error("🔥 Erreur création groupe (Mongoose):", err); 
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER MES GROUPES
router.get('/', async (req, res) => {
  try {
    // 👇 CORRECTION ICI AUSSI
    const myOwnerId = req.user.id || req.user.userId;

    const groups = await Group.find({ ownerId: myOwnerId }).populate('members');
    res.json(groups);
  } catch (err) {
    console.error("Erreur récupération groupes:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;