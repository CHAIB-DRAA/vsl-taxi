const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const Ride = require('../models/Ride'); 

// 👇 AJOUTE CETTE LIGNE (C'est ce qu'il manquait)
const auth = require('../middleware/auth'); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- UPLOAD ---
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { patientName, docType, rideId, patientId } = req.body; // J'ai ajouté patientId au cas où
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Aucune image reçue" });

    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const newDoc = new Document({
      patientName: patientName,
      rideId: rideId || null, 
      patientId: patientId || null, // On sauvegarde aussi l'ID patient si dispo
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

// --- RÉCUPÉRATION PAR COURSE (Ancienne méthode, toujours utile) ---
router.get('/by-ride/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    const patientName = ride.patientName;

    const docs = await Document.find({
      $or: [
        { rideId: rideId },
        { 
          patientName: patientName, 
          type: { $in: ['CarteVitale', 'Mutuelle'] }
        }
      ]
    }).sort({ uploadDate: -1 });

    res.json(docs);

  } catch (err) {
    console.error("Erreur récup docs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// --- RÉCUPÉRATION PAR PATIENT (Nouvelle méthode pour le partage) ---
// 👇 Maintenant 'auth' est bien défini grâce à l'import en haut
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1. Trouver toutes les courses liées à ce patient (si le modèle Ride a bien un champ patientId)
    // Note : Si tes anciennes courses n'ont pas de patientId, cette partie renverra vide, ce n'est pas grave.
    const rides = await Ride.find({ patientId: patientId }).select('_id');
    const rideIds = rides.map(r => r._id);

    // 2. Trouver les documents
    const docs = await Document.find({
      $or: [
        { patientId: patientId }, // Docs liés directement au patient
        { rideId: { $in: rideIds } } // Docs liés aux courses de ce patient (PMT)
      ]
    }).sort({ uploadDate: -1 });

    res.json(docs);
  } catch (err) {
    console.error("Erreur route patient:", err);
    res.status(500).json({ error: "Erreur récupération documents" });
  }
});
// DELETE /api/documents/:id
// Supprimer un document spécifique
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document introuvable" });
    res.json({ message: "Document supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;