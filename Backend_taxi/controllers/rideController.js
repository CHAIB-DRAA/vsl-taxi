const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');

// Utilitaire : récupérer une course autorisée pour un utilisateur
const findAuthorizedRide = async (rideId, chauffeurId) => {
  // Chercher la course si c'est le propriétaire
  let ride = await Ride.findOne({ _id: rideId, chauffeurId });

  // Sinon vérifier si elle est partagée
  if (!ride) {
    const shared = await RideShare.findOne({ rideId, toUserId: chauffeurId, statusPartage: 'accepted' });
    if (!shared) return null;
    ride = await Ride.findById(rideId);
  }

  return ride;
};

// === Créer une course
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.body.chauffeurId;
    if (!chauffeurId) return res.status(400).json({ error: "Chauffeur manquant" });

    const ride = new Ride({ ...req.body, chauffeurId });
    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// === Récupérer toutes les courses (propres + partagées acceptées)
exports.getRides = async (req, res) => {
  try {
    const chauffeurId = req.query.chauffeurId; // passé en query pour test
    if (!chauffeurId) return res.status(400).json({ error: "Chauffeur manquant" });

    const ownRides = await Ride.find({ chauffeurId });
    const sharedLinks = await RideShare.find({ toUserId: chauffeurId, statusPartage: 'accepted' });
    const sharedRideIds = sharedLinks.map(l => l.rideId);
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
    res.status(500).json({ message: err.message });
  }
};

// === Mettre à jour une course
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.body.chauffeurId },
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
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.body.chauffeurId });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Démarrer une course
exports.startRide = async (req, res) => {
  try {
    const ride = await findAuthorizedRide(req.params.id, req.body.chauffeurId);
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

    const ride = await findAuthorizedRide(req.params.id, req.body.chauffeurId);
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
