const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const Ride = require('../models/Ride'); // Vérifie que le fichier s'appelle bien Ride.js (Majuscule !)

// 👇 1. IMPORT DU MIDDLEWARE
// Vérifie que le fichier est bien dans le dossier middleware et s'appelle 'auth.js' ou 'authMiddleware.js'
const authMiddleware = require('../middleware/auth'); 

// 👇 2. PROTECTION DES ROUTES
router.use(authMiddleware);

// 1. ENVOYER UNE COURSE
router.post('/send', async (req, res) => {
  console.log("📩 Tentative d'envoi de dispatch...");
  console.log("📦 Body reçu:", req.body);
  console.log("👤 User:", req.user);

  try {
    const { rideId, targetGroupId, targetUserId } = req.body;

    // Vérification basique
    if (!rideId) {
        console.error("❌ Erreur: rideId manquant");
        return res.status(400).json({ error: "L'ID de la course est requis." });
    }

    // Mise à jour de la course
    const updatedRide = await Ride.findByIdAndUpdate(rideId, { status: 'Dispatchée' });
    if (!updatedRide) {
        console.error("❌ Erreur: Course introuvable en BDD");
        return res.status(404).json({ error: "Course introuvable." });
    }

    // Création du dispatch
    const newDispatch = new Dispatch({
      rideId,
      senderId: req.user.userId, // Si ça plante ici, c'est que authMiddleware ne marche pas
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

// 2. RÉCUPÉRER LES OFFRES
router.get('/my-offers', async (req, res) => {
  try {
    const myUserId = req.user.userId;
    const offers = await Dispatch.find({
        targetUserId: myUserId, 
        status: 'pending'
    })
    .populate('rideId')
    .populate('senderId', 'fullName phone'); // Vérifie que ton User a bien fullName et phone

    res.json(offers);
  } catch (err) {
    console.error("🔥 Erreur récupération offres:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ACCEPTER UNE OFFRE
router.post('/accept/:dispatchId', async (req, res) => {
    res.json({ message: "Course acceptée !" });
});

module.exports = router;