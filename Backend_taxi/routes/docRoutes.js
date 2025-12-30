const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document'); // On importe le nouveau modèle

// On stocke l'image temporairement dans la mémoire vive (RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route POST : /api/documents/upload
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { patientName, docType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Aucune image reçue" });
    }

    console.log(`📸 Réception scan pour ${patientName} (${docType})`);

    // 1. CONVERSION MAGIQUE : Buffer (Fichier) -> String (Base64)
    // On crée une chaîne du type : "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // 2. SAUVEGARDE DANS MONGODB
    const newDoc = new Document({
      patientName: patientName,
      type: docType,
      imageData: base64Image
    });

    await newDoc.save();

    console.log("✅ Document sauvegardé en sécurité dans MongoDB");

    res.json({ message: "Document sécurisé dans la base de données" });

  } catch (err) {
    console.error("❌ Erreur sauvegarde MongoDB:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

module.exports = router;