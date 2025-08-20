const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');

// Utilitaire : récupérer une course autorisée pour l'utilisateur
const findAuthorizedRide = async (rideId, userId) => {
  // Chercher la course si c'est le propriétaire
  let ride = await Ride.findOne({ _id: rideId, chauffeurId: userId });

  // Sinon vérifier si elle est partagée
  if (!ride) {
    const shared = await RideShare.findOne({ rideId, toUserId: userId, statusPartage: 'accepted' });
    if (!shared) return null;
    ride = await Ride.findById(rideId);
  }

  return ride;
};

// === Créer une course
exports.createRide = async (req, res) => {
  try {
    const ride = new Ride({ ...req.body, chauffeurId: req.user.id });
    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// === Récupérer toutes les courses (propres + partagées acceptées)
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;

    // Courses créées par le chauffeur
    const ownRides = await Ride.find({ chauffeurId: userId });

    // Courses partagées avec lui et acceptées
    const sharedLinks = await RideShare.find({ toUserId: userId, statusPartage: 'accepted' });
    const sharedRideIds = sharedLinks.map(link => link.rideId);
    const sharedRidesRaw = await Ride.find({ _id: { $in: sharedRideIds } });

    const sharedRides = sharedRidesRaw.map(ride => {
      const link = sharedLinks.find(l => l.rideId.toString() === ride._id.toString());
      return { 
        ...ride.toObject(),
        isShared: true,
        statusPartage: link?.statusPartage || 'pending'
      };
    });

    const allRides = [...ownRides, ...sharedRides];
    allRides.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allRides);
  } catch (err) {
    console.error('Erreur getRides:', err);
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
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Supprimer une course
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Course introuvable ou déjà supprimée" });
    res.json({ message: "Course supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Démarrer une course (propriétaire ou partagé accepté)
exports.startRide = async (req, res) => {
  try {
    const ride = await findAuthorizedRide(req.params.id, req.user.id);
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });

    ride.startTime = new Date();
    ride.status = 'En cours';
    await ride.save();

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Terminer une course avec distance
exports.endRide = async (req, res) => {
  try {
    const { distance } = req.body;
    if (!distance) return res.status(400).json({ message: "Distance non renseignée" });

    const ride = await findAuthorizedRide(req.params.id, req.user.id);
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });

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

    if (ride.chauffeurId !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé à partager cette course' });
    }

    const existing = await RideShare.findOne({ rideId, toUserId });
    if (existing) return res.json({ message: 'Course déjà partagée avec cet utilisateur' });

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

    res.json({ message: 'Course partagée avec succès', share });
  } catch (err) {
    console.error('Erreur shareRide:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// === Accepter ou refuser une course partagée
exports.respondToShare = async (req, res) => {
  const { shareId, action } = req.body; // action = 'accepted' | 'declined'

  if (!['accepted', 'declined'].includes(action)) {
    return res.status(400).json({ message: 'Action invalide' });
  }

  try {
    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ message: 'Partage introuvable' });

    if (share.toUserId !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé à répondre à ce partage' });
    }

    share.statusPartage = action;
    await share.save();

    res.json({ message: `Course ${action}`, share });
  } catch (err) {
    console.error('Erreur respondToShare:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
