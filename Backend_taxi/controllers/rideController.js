const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User'); // Assure que le modèle User existe
const { verifyToken } = require('../middleware/auth'); // <-- Ajoute cette ligne
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

// -------------------
// Récupérer toutes les courses (propres + partagées)
// -------------------
// === Récupérer toutes les courses (propres + partagées) ===
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let queryDateStart = null;
    let queryDateEnd = null;

    if (date) {
      const parsed = new Date(date);
      if (isNaN(parsed.valueOf())) return res.status(400).json({ message: 'Date invalide' });
      queryDateStart = new Date(parsed.setHours(0, 0, 0, 0));
      queryDateEnd = new Date(parsed.setHours(23, 59, 59, 999));
    }

    // 1️⃣ Courses propres (non partagées à d'autres ou partagées mais pending)
    const ownQuery = { 
      chauffeurId: userId, 
      $or: [{ sharedToOthers: { $exists: false } }, { sharedToOthers: false }] 
    };
    if (queryDateStart && queryDateEnd) ownQuery.date = { $gte: queryDateStart, $lte: queryDateEnd };
    const ownRides = await Ride.find(ownQuery);

    // 2️⃣ Courses partagées vers moi (acceptées ou pending)
    const sharedLinks = await RideShare.find({ toUserId: userId, statusPartage: { $in: ['pending', 'accepted'] } });
    const sharedRideIds = sharedLinks.map(l => l.rideId);
    const sharedRidesRaw = await Ride.find({ _id: { $in: sharedRideIds }, ...(queryDateStart && queryDateEnd ? { date: { $gte: queryDateStart, $lte: queryDateEnd } } : {}) });

    const sharedRides = await Promise.all(sharedRidesRaw.map(async (ride) => {
      const link = sharedLinks.find(l => l.rideId.toString() === ride._id.toString());
      const sharedByUser = await User.findById(link.fromUserId);
      return {
        ...ride.toObject(),
        isShared: true,
        sharedBy: link.fromUserId,
        sharedByName: sharedByUser?.fullName || sharedByUser?.email || 'Utilisateur',
        statusPartage: link.statusPartage,
        shareId: link._id
      };
    }));

    res.json([...ownRides, ...sharedRides].sort((a, b) => new Date(a.date) - new Date(b.date)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// === Partager une course ===
exports.shareRide = async (req, res) => {
  try {
    const { rideId, toUserId } = req.body;

    // Vérification des paramètres
    if (!rideId || !toUserId) {
      return res.status(400).json({ message: 'rideId et toUserId sont requis' });
    }

    // Vérifier que l'utilisateur est bien authentifié
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // Chercher la course
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Course introuvable' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la course
    if (ride.chauffeurId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Non autorisé à partager cette course' });
    }

    // Vérifier si la course est déjà partagée avec ce user
    const existingShare = await RideShare.findOne({ rideId, toUserId });
    if (existingShare) {
      return res.status(400).json({ message: 'Course déjà partagée avec cet utilisateur' });
    }

    // Créer le partage
    const newShare = new RideShare({
      rideId,
      fromUserId: req.user.id,
      toUserId,
      statusPartage: 'pending'
    });
    await newShare.save();

    // Mettre à jour la course
    ride.sharedToOthers = true;
    await ride.save();

    return res.status(201).json({
      message: 'Course partagée avec succès',
      share: newShare
    });

  } catch (err) {
    console.error('Erreur dans shareRide:', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
// === Accepter ou refuser un partage ===
exports.respondToShare = async (req, res) => {
  const { shareId, action } = req.body;
  if (!['accepted', 'declined'].includes(action)) return res.status(400).json({ message: 'Action invalide' });

  try {
    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ message: 'Partage introuvable' });
    if (share.toUserId.toString() !== req.user.id) return res.status(403).json({ message: 'Non autorisé' });

    share.statusPartage = action;
    await share.save();

    // Si refusé → supprimer de la liste frontend
    // Si accepté → restera visible comme partagé
    res.json({ message: `Course ${action}`, share });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
