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

// === Mettre à jour une course (status ou autres champs) pour propriétaire OU partagé
exports.updateRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const ride = await findAuthorizedRide(req.params.id, userId);

    if (!ride) {
      return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    }

    // Mettre à jour uniquement les champs envoyés
    Object.assign(ride, req.body);
    await ride.save();

    res.json(ride);
  } catch (err) {
    console.error(err);
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

// === Partager une course
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
