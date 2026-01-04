const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');

// 👇 1. IMPORT DU MIDDLEWARE
const authMiddleware = require('../middleware/auth'); 

// 👇 2. PROTECTION DES ROUTES
router.use(authMiddleware);

// 1. ENVOYER UNE COURSE
router.post('/send', async (req, res) => {
  console.log("📩 Tentative d'envoi de dispatch...");
  
  // 🔍 DEBUG : On vérifie l'utilisateur connecté
  console.log("👤 User connecté:", req.user);

  try {
    const { rideId, targetGroupId, targetUserId } = req.body;

    // Vérification de sécurité
    if (!rideId) return res.status(400).json({ error: "L'ID de la course est requis." });

    // Mise à jour de la course
    const updatedRide = await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });
    if (!updatedRide) return res.status(404).json({ error: "Course introuvable." });

    // 👇 LA CORRECTION EST ICI 👇
    // On prend 'id' OU 'userId' pour être sûr que ça marche quel que soit le token
    const myUserId = req.user.id || req.user.userId;

    if (!myUserId) {
        return res.status(401).json({ error: "Impossible d'identifier l'expéditeur." });
    }

    // Création du dispatch
    const newDispatch = new Dispatch({
      rideId,
      senderId: myUserId, // ✅ On utilise la variable sécurisée
      targetGroupId,
      targetUserId
    });
    
    await newDispatch.save();
    console.log("✅ Dispatch créé avec succès !");
    
    res.status(201).json({ message: "Offre envoyée !" });
  } catch (err) {
    console.error("🔥 CRASH SERVEUR DISPATCH:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-offers', async (req, res) => {
    try {
      const myUserId = req.user.id || req.user.userId;
  
      // 1. Trouver les ID de tous les groupes dont je suis membre
      const myGroups = await Group.find({ members: myUserId }).select('_id');
      const myGroupIds = myGroups.map(g => g._id.toString());
  
      // 2. Trouver les Dispatchs pour MOI ou pour MES GROUPES
      const offers = await Dispatch.find({
          $or: [
              { targetUserId: myUserId },          // Offre directe
              { targetGroupId: { $in: myGroupIds } } // Offre groupe
          ],
          status: 'pending' // Seulement celles en attente
      })
      .populate('rideId')
      .populate('senderId', 'fullName phone')
      .populate('targetGroupId', 'name'); // Pour afficher le nom du groupe
  
      res.json(offers);
    } catch (err) {
      console.error("🔥 Erreur my-offers:", err);
      res.status(500).json({ error: err.message });
    }
  });
  


module.exports = router;