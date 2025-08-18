const Ride = require('../models/Ride');

// Créer une course
exports.createRide = async (req, res) => {
  try {
    const ride = new Ride({ ...req.body, chauffeurId: req.user.id });
    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Récupérer toutes les courses du chauffeur
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find({ chauffeurId: req.user.id }).sort({ date: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour le statut d'une course
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

// Démarrer une course
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

// Terminer une course et enregistrer la distance
exports.endRide = async (req, res) => {
  try {
    const { distance } = req.body; // <-- Récupération de la distance envoyée
    if (!distance) return res.status(400).json({ message: "Distance non renseignée" });

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { endTime: new Date(), distance: parseFloat(distance) }, // <- sauvegarde distance
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: "Course introuvable ou non autorisée" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
