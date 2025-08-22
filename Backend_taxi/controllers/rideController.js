const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User'); // Assure que le modèle User existe
const Contact = require('../models/contact');

const mongoose = require('mongoose');

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




// -----------------------------
// Partager une course
// -----------------------------



exports.shareRide = async (req, res) => {
  try {
    const { rideId, toUserId } = req.body;
    console.log("=== Partage de course ===");
    console.log("rideId:", rideId);
    console.log("toUserId:", toUserId);

    // Récupérer la course
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.log("Course introuvable");
      return res.status(404).json({ message: "Course introuvable" });
    }

    const fromUserId = ride.chauffeurId; // ID du chauffeur propriétaire
    console.log("fromUserId (chauffeur propriétaire):", fromUserId);

    if (fromUserId.toString() === toUserId.toString()) {
      console.log("Tentative de partage avec soi-même");
      return res.status(400).json({ message: "Impossible de partager à soi-même" });
    }

    // Vérifier que le destinataire est bien un contact du chauffeur
    const contact = await Contact.findOne({ userId: fromUserId, contactId: toUserId });
    console.log("Contact trouvé:", contact);
    if (!contact) {
      return res.status(400).json({ message: "Le destinataire n'est pas un contact du chauffeur" });
    }

    // Créer une entrée RideShare
    const rideShare = new RideShare({
      rideId,
      fromUserId,
      toUserId,
      status: "pending"
    });
    await rideShare.save();
    console.log("RideShare créé:", rideShare);

    // Marquer la course comme partagée
    ride.isShared = true;
    await ride.save();
    console.log("Course mise à jour: isShared = true");

    res.json({ message: "Course partagée avec succès", rideShare });
  } catch (err) {
    console.error("Erreur partage course:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// --- GET /api/rides?date=YYYY-MM-DD ---
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

    console.log('📅 Paramètres reçus getRides:', { userId, date });

    // Courses propres
    const ownQuery = { chauffeurId: userId };
    if (start && end) ownQuery.date = { $gte: start, $lte: end };
    const ownRides = await Ride.find(ownQuery).lean();
    console.log('✅ Courses propres trouvées:', ownRides.length);

    // Shares reçus
    const shares = await RideShare.find({ toUserId: userId }).lean();
    console.log('🔄 Shares reçus:', shares.length);

    const shareIds = shares.map(s => s.rideId);
    const sharedRidesRaw = await Ride.find({ _id: { $in: shareIds } }).lean();

    // Décorer pour front
    const sharedRides = await Promise.all(sharedRidesRaw.map(async (ride) => {
      const link = shares.find(s => String(s.rideId) === String(ride._id));
      const fromUser = await User.findById(link.fromUserId).select('fullName email').lean();
      return {
        ...ride,
        isShared: true,
        sharedBy: link.fromUserId,
        sharedByName: fromUser?.fullName || fromUser?.email || 'Utilisateur',
        statusPartage: link.statusPartage,
        shareId: link._id
      };
    }));

    const all = [...ownRides, ...sharedRides].sort((a,b) => new Date(a.date) - new Date(b.date));
    console.log('📊 Total courses envoyées:', all.length);

    res.json(all);
  } catch (err) {
    console.error('getRides error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// --- POST /api/rides/respond ---
// body: { rideShareId, accept: true|false }
exports.respondRideShare = async (req, res) => {
  try {
    const { rideShareId, accept } = req.body;
    if (!rideShareId || typeof accept !== 'boolean') {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }

    console.log("=== Réponse à un partage de course ===", { rideShareId, accept });

    const rideShare = await RideShare.findById(rideShareId);
    if (!rideShare) {
      console.log("RideShare introuvable");
      return res.status(404).json({ message: "Partage introuvable" });
    }

    const ride = await Ride.findById(rideShare.rideId);
    if (!ride) {
      console.log("Course introuvable");
      return res.status(404).json({ message: "Course introuvable" });
    }

    // Vérifier que l'utilisateur courant est bien le destinataire
    if (String(rideShare.toUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (accept) {
      rideShare.statusPartage = "accepted";
      ride.chauffeurId = rideShare.toUserId; // transfert chauffeur
      ride.isShared = true;
      await ride.save();
      console.log("Invitation acceptée");
    } else {
      rideShare.statusPartage = "refused";

      // Forcer isShared = false dès qu’un partage est refusé
      ride.isShared = false;
      await ride.save();
      console.log("Invitation refusée => isShared = false");
    }

    await rideShare.save();
    console.log("RideShare mis à jour:", rideShare);

    res.json({ message: "Réponse enregistrée", rideShare, ride });
  } catch (err) {
    console.error("Erreur respondRideShare:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
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

// Mettre à jour le statut de facturation
exports.updateRideFacturation = async (req, res) => {
  try {
    const { statuFacturation } = req.body;
    const rideId = req.params.id;

    if (!['Non facturé', 'Facturé'].includes(statuFacturation)) {
      return res.status(400).json({ message: 'Statut de facturation invalide' });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, chauffeurId: req.user.id },
      { statuFacturation },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    res.json(ride);
  } catch (err) {
    console.error('Erreur updateRideFacturation:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
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
