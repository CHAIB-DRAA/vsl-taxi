const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const Ride = require('../models/Ride'); // Besoin pour trouver le nom du patient via l'ID de course

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- UPLOAD (Ajout intelligent) ---
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { patientName, docType, rideId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Aucune image reçue" });

    // Conversion Base64
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // Création du document
    const newDoc = new Document({
      patientName: patientName,
      rideId: rideId, // On lie à la course spécifique
      type: docType,
      imageData: base64Image
    });

    await newDoc.save();
    res.json({ message: "Document sauvegardé" });

  } catch (err) {
    console.error("❌ Erreur Upload:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// --- RÉCUPÉRATION INTELLIGENTE (La clé de ta demande) ---
router.get('/by-ride/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    // 1. On récupère les infos de la course pour avoir le nom du patient
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    const patientName = ride.patientName;

    // 2. La requête "MAGIQUE" :
    // - Soit c'est un document lié à CETTE course (ex: le PMT du jour)
    // - Soit c'est un document Permanent (Vitale/Mutuelle) de CE patient (peu importe la course)
    const docs = await Document.find({
      $or: [
        { rideId: rideId }, // Documents spécifiques à la course (PMT)
        { 
          patientName: patientName, 
          type: { $in: ['CarteVitale', 'Mutuelle'] } // Documents permanents
        }
      ]
    }).sort({ uploadDate: -1 }); // Les plus récents en premier

    res.json(docs);

  } catch (err) {
    console.error("Erreur récup docs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;