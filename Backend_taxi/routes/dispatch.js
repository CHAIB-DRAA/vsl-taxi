const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth'); 

// Protection des routes
router.use(authMiddleware);

// 1. ENVOYER UNE COURSE (Créer l'offre)
router.post('/send', async (req, res) => {
  console.log("📩 Envoi Dispatch...");
  try {
    const { rideId, targetGroupId, targetUserId } = req.body;
    const myUserId = req.user.id || req.user.userId;

    if (!rideId) return res.status(400).json({ error: "ID course manquant" });

    // On change le statut pour que l'envoyeur sache qu'elle est en cours de transfert
    await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });

    const newDispatch = new Dispatch({
      rideId,
      senderId: myUserId,
      targetGroupId,
      targetUserId,
      status: 'pending'
    });
    
    await newDispatch.save();
    console.log("✅ Offre créée !");
    res.status(201).json({ message: "Offre envoyée !" });
  } catch (err) {
    console.error("🔥 Erreur Send:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER LES OFFRES
router.get('/my-offers', async (req, res) => {
  try {
    const myUserId = req.user.id || req.user.userId;

    // A. Groupes
    const myGroups = await Group.find({ members: myUserId }).select('_id');
    const myGroupIds = myGroups.map(g => g._id);

    // B. Offres
    const offers = await Dispatch.find({
        $or: [
            { targetUserId: myUserId },
            { targetGroupId: { $in: myGroupIds } }
        ],
        status: 'pending'
    })
    .populate('rideId')
    .populate('senderId', 'fullName phone')
    .populate('targetGroupId', 'name');

    // C. Filtre de sécurité (Si la course a été supprimée entre temps)
    const validOffers = offers.filter(o => o.rideId !== null);

    res.json(validOffers);
  } catch (err) {
    console.error("🔥 Erreur My-Offers:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ACCEPTER UNE OFFRE (TRANSFERT DE PROPRIÉTÉ) 🔄
router.post('/accept/:dispatchId', async (req, res) => {
    console.log("🤝 Tentative de transfert...");
    try {
        const myUserId = req.user.id || req.user.userId;
        const { dispatchId } = req.params;

        // 1. Récupérer le Dispatch
        const dispatch = await Dispatch.findById(dispatchId);

        if (!dispatch) return res.status(404).json({ error: "Offre introuvable" });
        if (dispatch.status !== 'pending') return res.status(400).json({ error: "Offre déjà prise" });

        const rideId = dispatch.rideId;

        // 2. TRANSFERT MAGIQUE ✨
        // On cherche la course originale et on remplace le userId par le TIEN
        const updatedRide = await Ride.findByIdAndUpdate(
            rideId, 
            { 
                userId: myUserId,        // 👈 C'est toi le nouveau chef !
                status: 'Confirmée',     // On remet le statut "normal"
                isShared: true,          // Petit marqueur visuel
                // Optionnel : on peut ajouter une note automatique
                // $push: { logs: `Transféré le ${new Date()}` } 
            },
            { new: true } // Pour récupérer la version modifiée
        );

        if (!updatedRide) {
            return res.status(404).json({ error: "La course n'existe plus." });
        }

        // 3. Fermer l'offre de dispatch
        // Comme ça, les autres membres du groupe ne la verront plus !
        dispatch.status = 'accepted';
        await dispatch.save();

        console.log(`✅ Course transférée de ${dispatch.senderId} vers ${myUserId}`);

        res.json({ message: "Course transférée dans votre agenda !", ride: updatedRide });

    } catch (err) {
        console.error("🔥 Erreur Accept (Transfert):", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;