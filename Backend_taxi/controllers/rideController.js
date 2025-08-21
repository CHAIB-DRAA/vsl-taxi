const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User'); // Assure que le modèle User existe
const mongoose = require('mongoose');

// -------------------
// Utilitaire : récupérer une course autorisée
// -------------------
const findAuthorizedRide = async (rideId, userId) => {
  let ride = await Ride.findOne({ _id: rideId, chauffeurId: userId });

  if (!ride) {
    const shared = await RideShare.findOne({ rideId, toUserId: userId, statusPartage: 'accepted' });
    if (!shared) return null;
    ride = await Ride.findById(rideId);
  }

  return ride;
};

// -------------------
// Créer une course
// -------------------
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id;
    const { date, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    const rideDate = new Date(date);
    if (isNaN(rideDate.valueOf())) return res.status(400).json({ message: 'Date invalide' });

    const ride = new Ride({
      ...rest,
      date: rideDate,
      chauffeurId
    });

    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    console.error('Erreur création course :', err);
    res.status(500).json({ error: err.message });
  }
};


// --- GET /api/rides?date=YYYY-MM-DD ---
// Renvoie :
//   - tes courses (chauffeurId == toi)
//   - + invitations "PENDING" que TU as reçues (pour afficher Accepter/Refuser)




// -----------------------------
// Partager une course
// -----------------------------


exports.shareRide = async (req, res) => {
  try {
    const { rideId, toUserId } = req.body;
    const fromUserId = req.user.id;

    if (!rideId || !toUserId) {
      return res.status(400).json({ message: 'rideId et toUserId sont requis' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ message: 'Impossible de partager la course à soi-même' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Course introuvable' });

    if (String(ride.chauffeurId) !== String(fromUserId)) {
      return res.status(403).json({ message: 'Non autorisé à partager cette course' });
    }

    // Vérifier doublon
    const exists = await RideShare.findOne({ rideId: ride._id, toUserId });
    if (exists) return res.status(400).json({ message: 'Course déjà partagée avec cet utilisateur' });

    // Créer l’invitation
    const share = await RideShare.create({
      rideId: ride._id,
      fromUserId,
      toUserId,
      statusPartage: 'pending',
    });

    // Mettre à jour la course pour marquer comme partagée
    ride.isShared = true;
    ride.sharedBy = ride.sharedBy || [];
    if (!ride.sharedBy.includes(fromUserId)) ride.sharedBy.push(fromUserId);
    await ride.save();

    return res.status(201).json({ message: 'Invitation envoyée', share });

  } catch (err) {
    console.error('shareRide error:', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};


// -----------------------------
// Récupérer toutes les courses (propres + partagées)
// -----------------------------
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let start = null, end = null;
    if (date) {
      const d = new Date(date);
      if (isNaN(d.valueOf())) return res.status(400).json({ message: 'Date invalide' });
      start = new Date(d.setHours(0,0,0,0));
      end   = new Date(d.setHours(23,59,59,999));
    }

    // 1️⃣ Courses propres
    const ownQuery = { chauffeurId: userId };
    if (start && end) ownQuery.date = { $gte: start, $lte: end };
    const ownRides = await Ride.find(ownQuery).lean();

    // 2️⃣ Courses partagées reçues
    const shares = await RideShare.find({ toUserId: userId }).lean();
    const rideIds = shares.map(s => s.rideId);

    const sharedQuery = { _id: { $in: rideIds } };
    if (start && end) sharedQuery.date = { $gte: start, $lte: end };
    const sharedRidesRaw = await Ride.find(sharedQuery).lean();

    const sharedRides = sharedRidesRaw.map(ride => {
      const link = shares.find(s => String(s.rideId) === String(ride._id));
      return {
        ...ride,
        isShared: true,
        sharedBy: link.fromUserId,
        sharedByName: link.fromUserId, // tu peux remplacer par nom si tu joins User
        statusPartage: link.statusPartage,
        shareId: link._id,
      };
    });

    // 3️⃣ Combiner et trier
    const all = [...ownRides, ...sharedRides].sort((a,b) => new Date(a.date) - new Date(b.date));

    return res.json(all);

  } catch (err) {
    console.error('getRides error:', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};




// --- POST /api/rides/respond ---
// { shareId, action: 'accepted' | 'declined' }
// Si 'accepted' => TRANSFERT DE PROPRIÉTÉ : ride.chauffeurId = toUserId
exports.respondToShare = async (req, res) => {
  try {
    const { shareId, action } = req.body;
    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ message: 'Invitation introuvable' });

    // Seul le destinataire peut répondre
    if (String(share.toUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (share.statusPartage !== 'pending') {
      return res.status(400).json({ message: `Invitation déjà ${share.statusPartage}` });
    }

    // Récupérer la course
    const ride = await Ride.findById(share.rideId);
    if (!ride) return res.status(404).json({ message: 'Course introuvable' });

    if (action === 'declined') {
      share.statusPartage = 'declined';
      await share.save();
      return res.json({ message: 'Invitation refusée', share });
    }

    // === ACCEPTED => TRANSFERT DE PROPRIÉTÉ ===
    // Par sécurité : la course doit toujours appartenir à l’émetteur
    if (String(ride.chauffeurId) !== String(share.fromUserId)) {
      return res.status(409).json({ message: 'La course a changé de propriétaire entre-temps' });
    }

    // Transférer la propriété au destinataire
    ride.chauffeurId = share.toUserId;
    await ride.save();

    // Marquer l’invitation comme acceptée
    share.statusPartage = 'accepted';
    share.acceptedAt = new Date();
    await share.save();

    // Annuler toutes les autres invitations encore "pending" pour la même course
    await RideShare.updateMany(
      { rideId: ride._id, _id: { $ne: share._id }, statusPartage: 'pending' },
      { $set: { statusPartage: 'cancelled' } }
    );

    return res.json({ message: 'Course transférée', share, ride });
  } catch (err) {
    console.error('respondToShare error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


// -------------------
// Démarrer et terminer une course
// -------------------
exports.startRide = async (req, res) => {
  try {
    const ride = await findAuthorizedRide(req.params.id, req.user.id);
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    ride.startTime = new Date();
    ride.status = 'En cours';
    await ride.save();
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.endRide = async (req, res) => {
  try {
    const { distance } = req.body;
    if (!distance) return res.status(400).json({ message: "Distance manquante" });

    const ride = await findAuthorizedRide(req.params.id, req.user.id);
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    ride.endTime = new Date();
    ride.distance = parseFloat(distance);
    ride.status = 'Terminée';
    await ride.save();
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------
// Mettre à jour / Supprimer
// -------------------
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      req.body,
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Course introuvable" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
