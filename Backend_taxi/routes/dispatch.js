const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');

// 1. ENVOYER UNE COURSE (Créer une offre)
router.post('/send', async (req, res) => {
  try {
    const { rideId, targetGroupId, targetUserId } = req.body;
    // On marque la course originale comme "En cours de dispatch"
    await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });

    const newDispatch = new Dispatch({
      rideId,
      senderId: req.user.userId, // Suppose que tu as l'ID via le token
      targetGroupId,
      targetUserId
    });
    
    await newDispatch.save();
    res.status(201).json({ message: "Offre envoyée !" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER LES OFFRES POUR MOI (Ce que le collègue appelle)
router.get('/my-offers', async (req, res) => {
  try {
    const myUserId = req.user.userId;
    // Ici, logique simplifiée : on cherche ce qui m'est adressé
    // Dans un vrai système de groupe, il faudrait vérifier si je suis membre du groupe
    const offers = await Dispatch.find({
        $or: [
            { targetUserId: myUserId }, 
            // { targetGroupId: { $in: myUserGroups } } // À activer si tu gères les groupes en BDD
        ],
        status: 'pending'
    }).populate('rideId').populate('senderId', 'fullName phone');

    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ACCEPTER UNE OFFRE
router.post('/accept/:dispatchId', async (req, res) => {
    // Logique : Passer le dispatch en 'accepted', 
    // Copier la course dans le compte du collègue, 
    // Supprimer/Archiver chez l'envoyeur.
    // ... (Code complexe pour plus tard)
    res.json({ message: "Course acceptée !" });
});

module.exports = router;