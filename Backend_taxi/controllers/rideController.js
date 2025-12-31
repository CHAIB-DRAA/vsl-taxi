const Ride = require('../models/Ride');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk'); // <--- IMPORT POUR NOTIFS

// Initialisation du SDK Expo pour les notifs
const expo = new Expo();

// --- 1. CRÉATION ---
exports.createRide = async (req, res) => {
  try {
    const chauffeurId = req.user.id;
    // 👇 MODIFICATION ICI : On récupère explicitement le téléphone
    const { date, patientPhone, ...rest } = req.body;

    if (!date) return res.status(400).json({ message: 'Date manquante' });
    
    const ride = new Ride({
      ...rest,
      date: new Date(date),
      chauffeurId,
      // 👇 ON ENREGISTRE LE TÉLÉPHONE DANS LA BASE DE DONNÉES
      patientPhone: patientPhone || '', 
      status: 'En attente'
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
    const myId = req.user.id;

    // A. Récupérer mes courses créées par moi
    const myRides = await Ride.find({ userId: myId }).lean(); // .lean() rend l'objet modifiable

    // B. Récupérer les courses partagées avec moi
    const sharedShares = await RideShare.find({ toUserId: myId })
      .populate('rideId')      // Récupère les détails de la course
      .populate('fromUserId', 'fullName') // Récupère le nom du collègue
      .lean();

    // C. Transformer les partages pour qu'ils ressemblent à des courses normales
    const formattedSharedRides = sharedShares.map(share => {
      if (!share.rideId) return null; // Sécurité si la course originale a été supprimée
      
      return {
        ...share.rideId, // On prend toutes les infos de la course (date, patient...)
        _id: share.rideId._id, // On garde l'ID de la course
        isShared: true, // Marqueur pour le Frontend (couleur différente ?)
        sharedByName: share.fromUserId ? share.fromUserId.fullName : 'Inconnu',
        shareStatus: share.statusPartage,
        shareNote: share.sharedNote
      };
    }).filter(r => r !== null);

    // D. Fusionner les deux listes
    const allRides = [...myRides, ...formattedSharedRides];

    // E. Tri par date (le plus récent en premier ou inversement)
    allRides.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allRides);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération courses" });
  }
};

// --- 3. MISE À JOUR (PATCH) ---
exports.updateRide = async (req, res) => {
  try {
    const updates = req.body;
    
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { $set: updates },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ message: "Course introuvable" });
    }
    res.json(ride);
  } catch (err) {
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

// --- 5. PARTAGE AVEC NOTIFICATION & TÉLÉPHONE ---
exports.shareRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { targetUserId, note } = req.body;
    const myId = req.user.id;

    console.log("--- DEBUG PARTAGE ---");
    console.log("1. ID de la course demandé :", rideId);
    console.log("2. Mon ID (celui qui clique) :", myId);

    // ÉTAPE A : On cherche la course SANS vérifier le propriétaire d'abord
    const rideToCheck = await Ride.findById(rideId);

    if (!rideToCheck) {
      console.log("ERREUR : La course n'existe pas du tout dans la base.");
      return res.status(404).json({ message: "Course inexistante" });
    }

    console.log("3. Propriétaire réel de la course :", rideToCheck.userId);

    // ÉTAPE B : Comparaison
    // On convertit en String pour être sûr que la comparaison marche
    if (String(rideToCheck.userId) !== String(myId)) {
        console.log("ERREUR : Ce n'est pas votre course !");
        return res.status(403).json({ message: "Vous ne pouvez partager que VOS courses." });
    }

    // ÉTAPE C : Vérification doublon partage
    const existing = await RideShare.findOne({ rideId, toUserId: targetUserId });
    if (existing) {
        return res.status(400).json({ message: "Déjà partagée avec ce collègue" });
    }

    // ÉTAPE D : Création du partage
    const share = new RideShare({
      rideId,
      fromUserId: myId,
      toUserId: targetUserId,
      sharedNote: note,
      statusPartage: 'pending'
    });

    await share.save();
    console.log("SUCCÈS : Course partagée !");
    res.json({ message: "Course partagée !" });

  } catch (err) {
    console.error("CRASH SERVEUR :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- 6. RÉPONSE AU PARTAGE (Accepter/Refuser) ---
exports.respondRideShare = async (req, res) => {
  try {
    const { rideId, action } = req.body; // action: 'accepted' ou 'refused'
    
    // On cherche la course copiée chez le collègue
    const ride = await Ride.findOne({ _id: rideId, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    if (action === 'accepted') {
      ride.statusPartage = 'accepted'; 
      // Elle reste 'isShared: true' pour garder l'historique de qui l'a envoyée
    } else {
      // Si refusée, on la supprime de l'agenda du collègue
      await Ride.findByIdAndDelete(rideId);
      return res.json({ message: "Course refusée et retirée de l'agenda" });
    }

    await ride.save();
    res.json({ message: "Course acceptée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- 7. FACTURATION ---
exports.updateRideFacturation = async (req, res) => {
  try {
    const { statuFacturation } = req.body;
    
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
    res.status(500).json({ message: err.message });
  }
};

