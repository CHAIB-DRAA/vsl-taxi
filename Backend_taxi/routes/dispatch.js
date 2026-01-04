const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');
const Group = require('../models/Group'); // 👈 C'EST L'IMPORT QUI MANQUAIT !

// 👇 1. IMPORT DU MIDDLEWARE
const authMiddleware = require('../middleware/auth'); 

// 👇 2. PROTECTION DES ROUTES
router.use(authMiddleware);

// 1. ENVOYER UNE COURSE
router.post('/send', async (req, res) => {
  console.log("📩 Tentative d'envoi de dispatch...");
  
  try {
    const { rideId, targetGroupId, targetUserId } = req.body;

    // Vérification de sécurité
    if (!rideId) return res.status(400).json({ error: "L'ID de la course est requis." });

    // Mise à jour de la course
    const updatedRide = await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });
    if (!updatedRide) return res.status(404).json({ error: "Course introuvable." });

    // On récupère l'ID utilisateur de façon sécurisée
    const myUserId = req.user.id || req.user.userId;

    if (!myUserId) {
        return res.status(401).json({ error: "Impossible d'identifier l'expéditeur." });
    }

    // Création du dispatch
    const newDispatch = new Dispatch({
      rideId,
      senderId: myUserId, 
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

// 2. RÉCUPÉRER LES OFFRES (POUR MOI OU MES GROUPES)
router.get('/my-offers', async (req, res) => {
  try {
    const myUserId = req.user.id || req.user.userId;

    // 1. Trouver les ID de tous les groupes dont je suis membre
    // (Grâce à l'import de Group ligne 5, ça ne plantera plus ici)
    const myGroups = await Group.find({ members: myUserId }).select('_id');
    const myGroupIds = myGroups.map(g => g._id.toString());

    // 2. Trouver les Dispatchs pour MOI ou pour MES GROUPES
    const offers = await Dispatch.find({
        $or: [
            { targetUserId: myUserId },            // Offre directe
            { targetGroupId: { $in: myGroupIds } } // Offre groupe
        ],
        status: 'pending' // Seulement celles en attente
    })
    .populate('rideId')
    .populate('senderId', 'fullName phone')
    .populate('targetGroupId', 'name'); // On veut le nom du groupe

    res.json(offers);
  } catch (err) {
    console.error("🔥 Erreur my-offers:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ACCEPTER UNE OFFRE
router.post('/accept/:dispatchId', async (req, res) => {
    // Pour l'instant on fait simple
    // Plus tard : Il faudra copier la course dans ton compte
    res.json({ message: "Course acceptée !" });
});

module.exports = router;