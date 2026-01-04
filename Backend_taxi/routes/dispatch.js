const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride');

// 👇 1. IMPORT DU MIDDLEWARE (Vérifie bien le nom du fichier : auth ou authMiddleware ?)
const authMiddleware = require('../middleware/auth'); 

// 👇 2. SÉCURISATION DU ROUTEUR
router.use(authMiddleware);

// 1. ENVOYER UNE COURSE
router.post('/send', async (req, res) => {
  try {
    const { rideId, targetGroupId, targetUserId } = req.body;
    
    await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });

    const newDispatch = new Dispatch({
      rideId,
      senderId: req.user.userId, // req.user existe maintenant !
      targetGroupId,
      targetUserId
    });
    
    await newDispatch.save();
    res.status(201).json({ message: "Offre envoyée !" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RÉCUPÉRER LES OFFRES
router.get('/my-offers', async (req, res) => {
  try {
    const myUserId = req.user.userId;
    const offers = await Dispatch.find({
        $or: [
            { targetUserId: myUserId }, 
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
    res.json({ message: "Course acceptée !" });
});

module.exports = router;