const Ride = require('../models/Ride');
const User = require('../models/User');
const RideShare = require('../models/RideShare'); // <--- IMPORTANT : INDISPENSABLE POUR LE PARTAGE
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// --- 1. CRÉATION ---
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id; // On utilise chauffeurId
    const { date, patientPhone, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    
    const ride = new Ride({
      ...rest,
      date: new Date(date),
      chauffeurId, // Enregistré sous chauffeurId
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

// --- 2. RÉCUPÉRATION (GET) - FUSIONNÉE ---
exports.getRides = async (req, res) => {
  try {
    const myId = req.user.id;

    // A. Récupérer MES courses (créées par moi)
    // Attention : On utilise 'chauffeurId' ici aussi
    const myRides = await Ride.find({ chauffeurId: myId }).lean();

    // B. Récupérer les courses PARTAGÉES avec moi
    let formattedSharedRides = [];
    try {
      const sharedShares = await RideShare.find({ toUserId: myId })
        .populate('rideId')
        .populate('fromUserId', 'fullName')
        .lean();

      formattedSharedRides = sharedShares.map(share => {
        if (!share.rideId) return null;
        return {
          ...share.rideId,
          _id: share.rideId._id,
          isShared: true, // Marqueur visuel
          sharedByName: share.fromUserId ? share.fromUserId.fullName : 'Inconnu',
          shareStatus: share.statusPartage,
          shareNote: share.sharedNote
        };
      }).filter(r => r !== null);
    } catch (e) { console.log("Pas de partages ou erreur mineure"); }

    // C. Fusionner et Trier
    const allRides = [...myRides, ...formattedSharedRides];
    allRides.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(allRides);
  } catch (err) {
    console.error('Erreur getRides:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// --- 3. MISE À JOUR (PATCH) ---
exports.updateRide = async (req, res) => {
  try {
    const updates = req.body;
    
    // On vérifie chauffeurId
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { $set: updates },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Course introuvable" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- 4. SUPPRESSION ---
exports.deleteRide = async (req, res) => {
  try {
    // On vérifie chauffeurId
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- 5. PARTAGE (CORRIGÉ) ---
// Assure-toi d'avoir ces imports en haut

// ...

// 🚀 5. PARTAGE AVEC NOTIFICATION PUSH
exports.shareRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { targetUserId, note } = req.body;
    const myId = req.user.id;

    // 1. Vérif Chauffeur
    const ride = await Ride.findOne({ _id: rideId, chauffeurId: myId });
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });

    // 2. Vérif Doublon
    const existing = await RideShare.findOne({ rideId, toUserId: targetUserId });
    if (existing) return res.status(400).json({ message: "Déjà partagée" });

    // 3. Créer le partage (En attente)
    const share = new RideShare({
      rideId,
      fromUserId: myId,
      toUserId: targetUserId,
      sharedNote: note,
      statusPartage: 'pending' 
    });
    await share.save();

    // 4. --- ENVOI DE LA NOTIFICATION ---
    const targetUser = await User.findById(targetUserId);
    
    // Si le collègue a un token Expo enregistré
    if (targetUser && Expo.isExpoPushToken(targetUser.pushToken)) {
      await expo.sendPushNotificationsAsync([{
        to: targetUser.pushToken,
        sound: 'default',
        title: '🚕 Nouvelle course partagée',
        body: `Un collègue vous propose une course pour ${ride.patientName}.`,
        data: { rideId: rideId, type: 'share_request' }, // Pour ouvrir l'app au bon endroit
      }]);
      console.log("Notification envoyée à", targetUser.fullName);
    }

    res.json({ message: "Invitation envoyée !" });

  } catch (err) {
    console.error("Erreur Share:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🚀 6. RÉPONSE (ACCEPTER / REFUSER)
exports.respondRideShare = async (req, res) => {
  try {
    const { rideId, action } = req.body; // action = 'accepted' ou 'refused'
    const myId = req.user.id;

    // On cherche le partage qui ME concerne (toUserId = moi)
    const share = await RideShare.findOne({ rideId, toUserId: myId });

    if (!share) return res.status(404).json({ message: "Demande de partage introuvable" });

    if (action === 'refused') {
      // Si refusé, on supprime le partage (la course disparaît de mon agenda)
      await RideShare.findByIdAndDelete(share._id);
      return res.json({ message: "Partage refusé." });
    } 
    
    if (action === 'accepted') {
      // Si accepté, on met à jour le statut
      share.statusPartage = 'accepted';
      await share.save();
      return res.json({ message: "Course acceptée et ajoutée à votre agenda !" });
    }

    res.status(400).json({ message: "Action inconnue" });

  } catch (err) {
    console.error(err);
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
      { _id: req.params.id, chauffeurId: req.user.id }, // Utilisation de chauffeurId
      { $set: { statuFacturation } },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};