const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');

// Utilitaire : récupérer une course autorisée pour l'utilisateur
const findAuthorizedRide = async (rideId, userId) => {
  // Chercher la course si c'est le propriétaire
  let ride = await Ride.findOne({ _id: rideId, chauffeurId: userId });

  // Sinon vérifier si elle est partagée
  if (!ride) {
    const shared = await RideShare.findOne({ rideId, toUserId: userId });
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

// === Récupérer toutes les courses du chauffeur + courses partagées
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;

    // Courses créées par le chauffeur
    const ownRides = await Ride.find({ chauffeurId: userId });

    // Courses partagées avec lui
    const sharedRidesIds = await RideShare.find({ toUserId: userId }).distinct('rideId');
    const sharedRides = await Ride.find({ _id: { $in: sharedRidesIds } });

    // Fusionner et trier par date
    const rides = [...ownRides, ...sharedRides].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

// === Démarrer une course (propriétaire ou partagé)
exports.startRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const ride = await findAuthorizedRide(req.params.id, userId);

    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });

    ride.startTime = new Date();
    await ride.save();

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Terminer une course avec distance (propriétaire ou partagé)
exports.endRide = async (req, res) => {
  try {
    const { distance } = req.body;
    if (!distance) return res.status(400).json({ message: "Distance non renseignée" });

    const userId = req.user.id;
    const ride = await findAuthorizedRide(req.params.id, userId);

    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });

    ride.endTime = new Date();
    ride.distance = parseFloat(distance);
    await ride.save();

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Partager une course// rideController.js


exports.shareRide = async (req, res) => {
  const { rideId, fromUserId, toUserId, newChauffeurId } = req.body;

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Course introuvable' });

    if (ride.chauffeurId.toString() !== fromUserId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    ride.chauffeurId = newChauffeurId;
    ride.shared = true;

    await ride.save();
    res.json(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

