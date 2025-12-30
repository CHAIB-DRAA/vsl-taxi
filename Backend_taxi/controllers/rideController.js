const Ride = require('../models/Ride');
const RideShare = require('../models/RideShare');
const User = require('../models/User');
const Contact = require('../models/contact');

// --- 1. CRÉATION ---
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id;
    const { date, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    
    const ride = new Ride({
      ...rest,
      date: new Date(date),
      chauffeurId,
      status: 'En attente' // Statut par défaut
    });

    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    console.error('Erreur création:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- 2. RÉCUPÉRATION (GET) ---
exports.getRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let dateFilter = {};
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end   = new Date(d.setHours(23,59,59,999));
      dateFilter = { date: { $gte: start, $lte: end } };
    }

    // 1. Mes courses
    const ownRides = await Ride.find({ chauffeurId: userId, ...dateFilter }).lean();

    // 2. Courses partagées avec moi
    const shares = await RideShare.find({ toUserId: userId }).lean();
    const shareIds = shares.map(s => s.rideId);
    
    // On récupère les courses partagées (attention au filtre date si appliqué)
    const sharedRidesRaw = await Ride.find({ _id: { $in: shareIds }, ...dateFilter }).lean();

    // On ajoute les métadonnées de partage
    const sharedRides = await Promise.all(sharedRidesRaw.map(async (ride) => {
      const link = shares.find(s => String(s.rideId) === String(ride._id));
      const fromUser = await User.findById(link.fromUserId).select('fullName email').lean();
      return {
        ...ride,
        isShared: true,
        sharedBy: link.fromUserId,
        sharedByName: fromUser?.fullName || fromUser?.email || 'Collègue',
        statusPartage: link.statusPartage,
        shareId: link._id
      };
    }));

    // Fusion et tri
    const all = [...ownRides, ...sharedRides].sort((a,b) => new Date(a.date) - new Date(b.date));
    res.json(all);
  } catch (err) {
    console.error('Erreur getRides:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// --- 3. MISE À JOUR GÉNÉRIQUE (PATCH) ---
// C'est cette fonction qui gère le Démarrage, la Fin, et la modification
exports.updateRide = async (req, res) => {
  try {
    const updates = req.body;
    
    // Sécurité : On vérifie que c'est bien TA course avant de la modifier
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id }, // Filtre : ID + Propriétaire
      { $set: updates }, // Mise à jour
      { new: true } // Renvoie la version mise à jour
    );

    if (!ride) {
      // Si on ne trouve rien, c'est soit l'ID est faux, soit ce n'est pas ta course
      return res.status(404).json({ message: "Course introuvable ou vous n'êtes pas le chauffeur" });
    }

    // Petit log pour le débug
    console.log(`Course ${ride._id} mise à jour. Status: ${ride.status}`);
    
    res.json(ride);
  } catch (err) {
    console.error("Erreur updateRide:", err);
    res.status(500).json({ message: err.message });
  }
};

// --- 4. SUPPRESSION ---
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Introuvable" });
    res.json({ message: "Course supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- 5. PARTAGE ---
exports.shareRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { targetUserId, note } = req.body; // <--- On récupère la note ici

    const originalRide = await Ride.findById(rideId);
    if (!originalRide) return res.status(404).json({ message: "Course introuvable" });

    // On crée la copie pour le collègue
    const newRide = new Ride({
      patientName: originalRide.patientName,
      startLocation: originalRide.startLocation,
      endLocation: originalRide.endLocation,
      date: originalRide.date,
      time: originalRide.time,
      type: originalRide.type,
      isRoundTrip: originalRide.isRoundTrip,
      
      userId: targetUserId, // On l'attribue au collègue
      
      // INFOS DE PARTAGE
      isShared: true,
      sharedByName: req.user.fullName, // Ton nom à toi
      shareNote: note || '' // <--- ON SAUVEGARDE LA NOTE ICI
    });

    await newRide.save();
    res.status(200).json({ message: "Course partagée avec succès" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.respondRideShare = async (req, res) => {
  try {
    const { shareId, action } = req.body; // action: 'accepted' ou 'refused'
    
    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ message: "Partage introuvable" });

    if (String(share.toUserId) !== req.user.id) return res.status(403).json({ message: "Non autorisé" });

    const ride = await Ride.findById(share.rideId);
    
    if (action === 'accepted') {
      share.statusPartage = 'accepted';
      // TRANSFERT DE PROPRIÉTÉ
      ride.chauffeurId = req.user.id; 
      ride.isShared = true; // Reste marqué comme partagé pour l'historique
    } else {
      share.statusPartage = 'refused';
      // Si refusé, on pourrait remettre isShared à false si c'était le seul partage, 
      // mais on garde simple pour l'instant.
    }

    await share.save();
    await ride.save();

    res.json({ message: `Partage ${action}` });
  } catch (err) {
    console.error("Erreur respond:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ... (le reste de tes fonctions)

// --- GESTION FACTURATION (La fonction manquante) ---
exports.updateRideFacturation = async (req, res) => {
  try {
    const { statuFacturation } = req.body;
    
    // On vérifie que le statut est valide
    if (!['Non facturé', 'Facturé'].includes(statuFacturation)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { $set: { statuFacturation } },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    res.json(ride);
  } catch (err) {
    console.error("Erreur facturation:", err);
    res.status(500).json({ message: err.message });
  }
};