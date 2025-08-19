const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');

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

// === Récupérer toutes les courses du chauffeur + courses partagées avec lui
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;

    // Courses créées par le chauffeur
    const ownRides = await Ride.find({ chauffeurId: userId });

    // Courses partagées avec l'utilisateur
    const sharedRidesIds = await RideShare.find({ toUserId: userId }).distinct('rideId');
    const sharedRides = await Ride.find({ _id: { $in: sharedRidesIds } });

    // Fusionner et trier par date
    const rides = [...ownRides, ...sharedRides].sort((a, b) => b.date - a.date);

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// === Mettre à jour le statut d'une course
exports.updateRide = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { status },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Démarrer une course
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { startTime: new Date() },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Terminer une course et enregistrer la distance
exports.endRide = async (req, res) => {
  try {
    const { distance } = req.body;
    if (!distance) return res.status(400).json({ message: "Distance non renseignée" });

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { endTime: new Date(), distance: parseFloat(distance) },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Partager une course avec un autre utilisateur
exports.shareRide = async (req, res) => {
  const { rideId, fromUserId, toUserId } = req.body;

  if (!rideId || !fromUserId || !toUserId) {
    return res.status(400).json({ success: false, error: 'Données manquantes' });
  }

  try {
    // Vérifier si la course existe
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, error: 'Course introuvable' });

    // Créer le partage
    const share = await RideShare.create({ rideId, fromUserId, toUserId });
    res.status(200).json({ success: true, shareId: share._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
