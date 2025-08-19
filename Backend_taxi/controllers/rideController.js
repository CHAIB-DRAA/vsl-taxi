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

    // 1️⃣ Courses créées par le chauffeur et non partagées
    const ownRides = await Ride.find({ 
      chauffeurId: userId,
      isShared: { $ne: true } // ignore les rides déjà partagées
    });

    // 2️⃣ Courses partagées avec lui
    const sharedLinks = await RideShare.find({ toUserId: userId });
    const sharedRideIds = sharedLinks.map(link => link.rideId);
    const sharedRidesRaw = await Ride.find({ _id: { $in: sharedRideIds } });

    // 3️⃣ Ajouter les flags pour les courses partagées
    const sharedRides = sharedRidesRaw.map(ride => {
      const link = sharedLinks.find(l => l.rideId.toString() === ride._id.toString());
      return { 
        ...ride.toObject(), 
        isShared: true, 
        statusPartage: link?.statusPartage || 'pending' 
      };
    });

    // 4️⃣ Fusionner les courses propres et partagées
    const allRides = [...ownRides, ...sharedRides];

    // 5️⃣ Trier par date (ancienne → récente)
    allRides.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allRides);
  } catch (err) {
    console.error('Erreur getRides:', err);
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

exports.shareRide = async (req, res) => {
  const { rideId, toUserId } = req.body;

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Course introuvable' });

    // Vérifie que l'utilisateur est bien le propriétaire
    if (ride.chauffeurId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé à partager cette course' });
    }

    // Met à jour le chauffeur de la course pour le destinataire
    ride.chauffeurId = toUserId;

    // Optionnel : tu peux garder un champ "sharedBy" pour savoir qui a partagé la course
    ride.sharedBy = req.user.id;

    await ride.save();

    res.json({ message: 'Course partagée et transférée au destinataire', ride });
  } catch (err) {
    console.error('Erreur shareRide:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
