const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const Ride = require('../models/Ride'); 
const auth = require('../middleware/auth'); // Import du middleware d'auth

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 1. UPLOAD (Générique : Patient, Course ou Chauffeur) ---
// J'ai ajouté 'auth' ici pour avoir accès à req.user.id
router.post('/upload', auth, upload.single('photo'), async (req, res) => {
  try {
    const { patientName, docType, rideId, patientId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Aucune image reçue" });

    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const newDoc = new Document({
      userId: req.user.id, // 👈 IMPORTANT : On lie le document au chauffeur connecté
      patientName: patientName || "Inconnu",
      rideId: rideId || null, 
      patientId: patientId || null,
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

// --- 2. RÉCUPÉRER MES DOCUMENTS ADMIN (Chauffeur) ---
router.get('/driver/me', auth, async (req, res) => {
  try {
    // On cherche les documents qui T'appartiennent (userId)
    // et qui ont le mot-clé spécial "CHAUFFEUR"
    const docs = await Document.find({
      userId: req.user.id,     // 👈 Sécurité : Uniquement tes docs
      patientName: "CHAUFFEUR" // Filtre : Uniquement les docs admin
    }).sort({ uploadDate: -1 });

    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// --- 3. RÉCUPÉRER PAR COURSE (Historique) ---
router.get('/by-ride/:rideId', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Course introuvable" });

    const docs = await Document.find({
      $or: [
        { rideId: rideId },
        { 
          patientName: ride.patientName, 
          type: { $in: ['CarteVitale', 'Mutuelle'] } // Documents permanents du patient
        }
      ]
    }).sort({ uploadDate: -1 });

    res.json(docs);

  } catch (err) {
    console.error("Erreur récup docs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// --- 4. RÉCUPÉRER PAR PATIENT (Dossier Patient) ---
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1. Trouver les courses de ce patient pour avoir aussi les PMT liés aux courses
    const rides = await Ride.find({ patientId: patientId }).select('_id');
    const rideIds = rides.map(r => r._id);

    // 2. Trouver les documents (Directs + liés aux courses)
    const docs = await Document.find({
      $or: [
        { patientId: patientId }, 
        { rideId: { $in: rideIds } }
      ]
    }).sort({ uploadDate: -1 });

    res.json(docs);
  } catch (err) {
    console.error("Erreur route patient:", err);
    res.status(500).json({ error: "Erreur récupération documents" });
  }
});

// --- 5. SUPPRIMER UN DOCUMENT ---
router.delete('/:id', auth, async (req, res) => {
  try {
    // 👈 SÉCURITÉ : On utilise findOneAndDelete avec userId
    // Cela empêche de supprimer le document d'un autre chauffeur par erreur
    const doc = await Document.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!doc) return res.status(404).json({ message: "Document introuvable ou accès refusé" });
    
    res.json({ message: "Document supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;