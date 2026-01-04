const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth'); 

router.use(authMiddleware); 

// 1. CRÉER UN GROUPE (MODE DIAGNOSTIC)
router.post('/', async (req, res) => {
  console.log("------------------------------------------------");
  console.log("🕵️‍♂️ DIAGNOSTIC CRÉATION GROUPE START");
  
  // 1. Vérifier le Token / User
  console.log("1️⃣ User Auth:", req.user);
  const myOwnerId = req.user.id || req.user.userId;
  if (!myOwnerId) {
      console.log("❌ ERREUR: Pas d'ID utilisateur trouvé !");
      return res.status(401).json({ error: "Auth failed" });
  }
  console.log("✅ Owner ID validé:", myOwnerId);

  // 2. Vérifier les données reçues
  const { name, members } = req.body;
  console.log("2️⃣ Payload Body:", JSON.stringify(req.body, null, 2));

  try {
    const newGroup = new Group({
      name: name,
      members: members, 
      ownerId: myOwnerId 
    });

    console.log("3️⃣ Objet Mongoose préparé:", newGroup);

    // 3. TENTATIVE DE SAUVEGARDE
    const savedGroup = await newGroup.save();
    
    console.log("✅ SUCCÈS ! Groupe sauvegardé avec ID:", savedGroup._id);
    console.log("------------------------------------------------");

    // On renvoie le résultat
    const populatedGroup = await Group.findById(savedGroup._id).populate('members');
    res.status(201).json(populatedGroup);

  } catch (err) {
    console.log("🔥 ÉCHEC SAUVEGARDE MONGOOSE 🔥");
    
    // Affiche l'erreur complète (souvent l'info est cachée dans 'errors')
    if (err.name === 'ValidationError') {
        for (field in err.errors) {
            console.log(`❌ Erreur sur le champ '${field}':`, err.errors[field].message);
        }
    } else {
        console.log("❌ Erreur Générale:", err);
    }
    
    console.log("------------------------------------------------");
    res.status(500).json({ error: err.message, details: err.errors });
  }
});

// 2. RÉCUPÉRER MES GROUPES
router.get('/', async (req, res) => {
  try {
    const myOwnerId = req.user.id || req.user.userId;
    const groups = await Group.find({ ownerId: myOwnerId }).populate('members');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;