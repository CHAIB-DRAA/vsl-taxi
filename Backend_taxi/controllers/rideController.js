const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User'); // <--- Assure que le modèle User existe

const findAuthorizedRide = async (rideId, userId) => {
  let ride = await Ride.findOne({ _id: rideId, chauffeurId: userId });

  if (!ride) {
    const shared = await RideShare.findOne({ rideId, toUserId: userId, statusPartage: 'accepted' });
    if (!shared) return null;
    ride = await Ride.findById(rideId);
  }

  return ride;
};


// === Créer une course sécurisée ===
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id; // depuis token
    const { date, ...rest } = req.body;

    // Vérifier que la date est valide
    if (!date) {
      return res.status(400).json({ message: 'Date manquante' });
    }

    const rideDate = new Date(date);
    if (isNaN(rideDate.valueOf())) {
      return res.status(400).json({ message: 'Date invalide' });
    }

    // Créer la course avec la date convertie
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


// === Récupérer toutes les courses (propres + partagées)
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query; // YYYY-MM-DD
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Courses propres filtrées par date
    const ownRides = await Ride.find({
      chauffeurId: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Courses partagées vers moi filtrées par date
    const sharedLinks = await RideShare.find({ toUserId: userId, statusPartage: 'accepted' });
    const sharedRideIds = sharedLinks.map(l => l.rideId);
    const sharedRidesRaw = await Ride.find({
      _id: { $in: sharedRideIds },
      date: { $gte: startOfDay, $lte: endOfDay }
    });

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

    // Courses que j’ai partagées à d’autres filtrées par date
    const sharedByMeLinks = await RideShare.find({ fromUserId: userId, statusPartage: 'accepted' });
    const sharedByMeIds = sharedByMeLinks.map(l => l.rideId);
    const sharedByMeRidesRaw = await Ride.find({
      _id: { $in: sharedByMeIds },
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const sharedByMeRides = await Promise.all(sharedByMeRidesRaw.map(async (ride) => {
      const link = sharedByMeLinks.find(l => l.rideId.toString() === ride._id.toString());
      const toUser = await User.findById(link.toUserId);
      return {
        ...ride.toObject(),
        isShared: true,
        sharedToName: toUser?.fullName || toUser?.email || 'Utilisateur',
        statusPartage: link.statusPartage
      };
    }));

    const allRides = [...ownRides, ...sharedRides, ...sharedByMeRides];
    allRides.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allRides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};



// === Mettre à jour une course
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

// === Supprimer une course
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Démarrer une course
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

// === Terminer une course
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

// === Partager une course
exports.shareRide = async (req, res) => {
  const { rideId, toUserId } = req.body;

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Course introuvable' });
    if (ride.chauffeurId.toString() !== req.user.id) return res.status(403).json({ message: 'Non autorisé' });

    const existing = await RideShare.findOne({ rideId, toUserId });
    if (existing) return res.json({ message: 'Course déjà partagée' });

    const share = new RideShare({
      rideId,
      fromUserId: req.user.id,
      toUserId,
      statusPartage: 'pending'
    });
    await share.save();

    ride.isShared = true;
    ride.sharedBy = req.user.id;
    await ride.save();

    // Récupérer noms pour frontend
    const toUser = await User.findById(toUserId).select('fullName email');

    res.json({ 
      message: 'Course partagée', 
      share: {
        ...share.toObject(),
        toUserName: toUser?.fullName || toUser?.email || 'Utilisateur'
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Accepter ou refuser un partage
exports.respondToShare = async (req, res) => {
  const { shareId, action } = req.body;
  if (!['accepted', 'declined'].includes(action)) return res.status(400).json({ message: 'Action invalide' });

  try {
    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ message: 'Partage introuvable' });
    if (share.toUserId.toString() !== req.user.id) return res.status(403).json({ message: 'Non autorisé' });

    share.statusPartage = action;
    await share.save();

    // Récupérer noms pour frontend
    const fromUser = await User.findById(share.fromUserId).select('fullName email');
    const toUser = await User.findById(share.toUserId).select('fullName email');

    res.json({
      message: `Course ${action}`,
      share: {
        ...share.toObject(),
        fromUserName: fromUser?.fullName || fromUser?.email || 'Utilisateur',
        toUserName: toUser?.fullName || toUser?.email || 'Utilisateur'
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
