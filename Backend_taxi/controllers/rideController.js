const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User'); // Assure que le modèle User existe
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

    // 1) Tes courses (propriétaire)
    const ownQuery = { chauffeurId: userId };
    if (start && end) ownQuery.date = { $gte: start, $lte: end };
    const ownRides = await Ride.find(ownQuery).lean();

    // 2) Invitations PENDING reçues (tu peux accepter/refuser)
    const pendingShares = await RideShare.find({ toUserId: userId, statusPartage: 'pending' }).lean();
    const pendingIds = pendingShares.map(s => s.rideId);
    const pendQuery = { _id: { $in: pendingIds } };
    if (start && end) pendQuery.date = { $gte: start, $lte: end };
    const pendingRidesRaw = await Ride.find(pendQuery).lean();

    // Décore pour le front (afin d'afficher boutons accepter/refuser)
    const pendingRides = await Promise.all(
      pendingRidesRaw.map(async (ride) => {
        const link = pendingShares.find(s => String(s.rideId) === String(ride._id));
        const fromUser = await User.findById(link.fromUserId).select('fullName email').lean();
        return {
          ...ride,
          isShared: true,
          // "invitation vers moi"
          sharedBy: link.fromUserId,
          sharedByName: fromUser?.fullName || fromUser?.email || 'Utilisateur',
          statusPartage: link.statusPartage, // 'pending'
          shareId: link._id
        };
      })
    );

    // ⚠️ On ne renvoie PAS les partages "accepted" vers toi : après acceptation
    // la course est déjà à toi (dans ownRides), donc pas de doublon.

    const all = [...ownRides, ...pendingRides].sort((a,b) => new Date(a.date) - new Date(b.date));
    res.json(all);
  } catch (err) {
    console.error('getRides error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.shareRide = async (req, res) => {
  try {
    const { rideId, toUserId } = req.body;

    // 1️⃣ Vérification des paramètres
    if (!rideId || !toUserId) {
      console.log('Paramètres manquants', { rideId, toUserId });
      return res.status(400).json({ message: 'rideId et toUserId sont requis', rideId, toUserId });
    }

    if (!req.user || !req.user.id) {
      console.log('Utilisateur non authentifié');
      return res.status(401).json({ message: 'Non authentifié' });
    }

    console.log('Paramètres reçus:', { rideId, toUserId, userId: req.user.id });

    // 2️⃣ Trouver la course
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.log('Course introuvable pour rideId:', rideId);
      return res.status(404).json({ message: 'Course introuvable', rideId });
    }

    // 3️⃣ Vérifier que l’utilisateur est bien le propriétaire
    if (String(ride.chauffeurId) !== String(req.user.id)) {
      console.log('Utilisateur non autorisé à partager cette course', { rideOwner: ride.chauffeurId, currentUser: req.user.id });
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // 4️⃣ Vérifier doublons avec conversion ObjectId
    const exists = await RideShare.findOne({ 
      rideId: mongoose.Types.ObjectId(rideId), 
      toUserId 
    });
    if (exists) {
      console.log('Course déjà partagée avec cet utilisateur', { rideId, toUserId });
      return res.status(400).json({ message: 'Course déjà partagée avec cet utilisateur' });
    }

    // 5️⃣ Créer l’invitation
    const share = await RideShare.create({
      rideId: mongoose.Types.ObjectId(rideId),
      fromUserId: req.user.id,
      toUserId,
      statusPartage: 'pending'
    });

    // 6️⃣ Mettre à jour la course
    if (!ride.isShared) {
      ride.isShared = true;
      ride.sharedBy = [req.user.id];
    } else {
      if (!Array.isArray(ride.sharedBy)) ride.sharedBy = [];
      if (!ride.sharedBy.includes(req.user.id)) ride.sharedBy.push(req.user.id);
    }
    ride.updatedAt = new Date();
    await ride.save();

    console.log('Invitation créée avec succès:', share);
    return res.status(201).json({ message: 'Invitation envoyée et course mise à jour', share });

  } catch (err) {
    console.error('shareRide error:', err);
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
