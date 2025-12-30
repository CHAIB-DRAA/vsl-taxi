const Ride = require('../models/Ride');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk'); // <--- IMPORT POUR NOTIFS

// Initialisation du SDK Expo pour les notifs
const expo = new Expo();

// --- 1. CRÉATION ---
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id;
    const { date, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    
    const ride = new Ride({
      ...rest,
      date: new Date(date),
      chauffeurId, // C'est toi le propriétaire
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

    // On récupère tout (les tiennes + celles partagées car elles ont ton chauffeurId maintenant)
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

// --- 5. PARTAGE AVEC NOTIFICATION ---
exports.shareRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { targetUserId, note } = req.body; // On récupère la note

    // 1. Trouver la course originale
    const originalRide = await Ride.findById(rideId);
    if (!originalRide) return res.status(404).json({ message: "Course introuvable" });

    // 2. Trouver le collègue (pour son token notif)
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "Collègue introuvable" });

    // 3. Créer la copie pour le collègue
    const newRide = new Ride({
      // Copie des infos
      patientName: originalRide.patientName,
      startLocation: originalRide.startLocation,
      endLocation: originalRide.endLocation,
      date: originalRide.date,
      type: originalRide.type,
      isRoundTrip: originalRide.isRoundTrip,
      
      // Attribution au collègue
      chauffeurId: targetUserId, 
      
      // Infos de partage
      isShared: true,
      statusPartage: 'pending', // En attente d'acceptation
      sharedByName: req.user.fullName, // Ton nom
      shareNote: note || '' // La note
    });

    await newRide.save();

    // 4. ENVOYER LA NOTIFICATION PUSH
    if (targetUser.pushToken && Expo.isExpoPushToken(targetUser.pushToken)) {
      const message = {
        to: targetUser.pushToken,
        sound: 'default',
        title: '🚕 Course reçue !',
        body: `${req.user.fullName} vous a envoyé une course. Note : ${note ? 'Oui' : 'Non'}`,
        data: { rideId: newRide._id },
        badge: 1,
      };

      // Envoi sans bloquer la réponse
      expo.sendPushNotificationsAsync([message]).catch(e => console.error("Erreur Push:", e));
    }

    res.status(200).json({ message: "Course partagée et notifiée" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
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
      // Si refusée, on la supprime carrément de son agenda ? 
      // Ou on met un statut 'refused' (selon ta préférence).
      // Ici, on supprime pour ne pas polluer l'agenda.
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