const Ride = require('../models/Ride');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk'); // <--- IMPORT POUR NOTIFS

// Initialisation du SDK Expo pour les notifs
const expo = new Expo();

// --- 1. CRÉATION ---
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id;
    // 👇 MODIFICATION ICI : On récupère explicitement le téléphone
    const { date, patientPhone, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    
    const ride = new Ride({
      ...rest,
      date: new Date(date),
      chauffeurId,
      // 👇 ON ENREGISTRE LE TÉLÉPHONE DANS LA BASE DE DONNÉES
      patientPhone: patientPhone || '', 
      status: 'En attente'
    });

    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    console.error('Erreur création:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- 2. RÉCUPÉRATION (GET) ---
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let filter = { chauffeurId: userId }; // On cherche TES courses

    // Filtre par date si demandé
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end   = new Date(d.setHours(23,59,59,999));
      filter.date = { $gte: start, $lte: end };
    }

    // On récupère tout (les tiennes + celles partagées acceptées ou en attente)
    const rides = await Ride.find(filter).sort({ date: 1 });
    
    res.json(rides);
  } catch (err) {
    console.error('Erreur getRides:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// --- 3. MISE À JOUR (PATCH) ---
exports.updateRide = async (req, res) => {
  try {
    const updates = req.body;
    
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { $set: updates },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ message: "Course introuvable" });
    }
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- 4. SUPPRESSION ---
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- 5. PARTAGE AVEC NOTIFICATION & TÉLÉPHONE ---
exports.shareRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { targetUserId, note } = req.body;
    const myId = req.user.id;

    // 1. Vérifier si la course existe
    const ride = await Ride.findOne({ _id: rideId, userId: myId });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    // 2. Vérifier si déjà partagée
    const existing = await RideShare.findOne({ rideId, toUserId: targetUserId });
    if (existing) return res.status(400).json({ message: "Déjà partagée avec ce collègue" });

    // 3. Créer le partage
    const share = new RideShare({
      rideId,
      fromUserId: myId,
      toUserId: targetUserId,
      sharedNote: note,
      statusPartage: 'pending' // Ou 'accepted' direct selon ta logique
    });

    await share.save();
    res.json({ message: "Course partagée !" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- 6. RÉPONSE AU PARTAGE (Accepter/Refuser) ---
exports.respondRideShare = async (req, res) => {
  try {
    const { rideId, action } = req.body; // action: 'accepted' ou 'refused'
    
    // On cherche la course copiée chez le collègue
    const ride = await Ride.findOne({ _id: rideId, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    if (action === 'accepted') {
      ride.statusPartage = 'accepted'; 
      // Elle reste 'isShared: true' pour garder l'historique de qui l'a envoyée
    } else {
      // Si refusée, on la supprime de l'agenda du collègue
      await Ride.findByIdAndDelete(rideId);
      return res.json({ message: "Course refusée et retirée de l'agenda" });
    }

    await ride.save();
    res.json({ message: "Course acceptée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- 7. FACTURATION ---
exports.updateRideFacturation = async (req, res) => {
  try {
    const { statuFacturation } = req.body;
    
    if (!['Non facturé', 'Facturé'].includes(statuFacturation)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { $set: { statuFacturation } },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

