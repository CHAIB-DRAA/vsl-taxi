const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth'); 

router.use(authMiddleware);

// 1. ENVOYER UNE COURSE
router.post('/send', async (req, res) => {
  console.log("📩 Envoi Dispatch...");
  try {
    const { rideId, targetGroupId, targetUserId } = req.body;
    const myUserId = req.user.id || req.user.userId;

    if (!rideId) return res.status(400).json({ error: "ID course manquant" });

    // On marque la course comme dispatchée
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

    // Filtre de sécurité
    const validOffers = offers.filter(o => o.rideId !== null);

    res.json(validOffers);
  } catch (err) {
    console.error("🔥 Erreur My-Offers:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ACCEPTER UNE OFFRE (CORRECTION ICI 🛠️)
router.post('/accept/:dispatchId', async (req, res) => {
    console.log("🤝 Tentative de transfert...");
    try {
        const myUserId = req.user.id || req.user.userId;
        const { dispatchId } = req.params;

        const dispatch = await Dispatch.findById(dispatchId);

        if (!dispatch) return res.status(404).json({ error: "Offre introuvable" });
        // On autorise 'accepted' temporairement si le front a buggé, sinon 'pending'
        if (dispatch.status !== 'pending' && dispatch.status !== 'accepted') return res.status(400).json({ error: "Offre déjà traitée" });

        const rideId = dispatch.rideId;

        // 👇 LA CORRECTION EST ICI : on utilise 'chauffeurId'
        const updatedRide = await Ride.findByIdAndUpdate(
            rideId, 
            { 
                chauffeurId: myUserId,   // ✅ On remplace l'ancien ID par le tien
                status: 'Confirmée',     // On remet le statut "Confirmée"
                isShared: true,          // Marqueur visuel
                shareNote: `Transféré depuis ${dispatch.senderId}`
            },
            { new: true }
        );

        if (!updatedRide) {
            return res.status(404).json({ error: "La course n'existe plus." });
        }

        // On ferme le dispatch
        dispatch.status = 'accepted';
        await dispatch.save();

        console.log(`✅ Course transférée ! Nouveau chauffeur : ${myUserId}`);

        // On renvoie la course mise à jour pour que le frontend puisse lire la date
        res.json({ message: "Course transférée !", ride: updatedRide });

    } catch (err) {
        console.error("🔥 Erreur Accept:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;