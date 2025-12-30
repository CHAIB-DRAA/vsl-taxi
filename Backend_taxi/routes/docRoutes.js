const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Stockage en mémoire tampon
const driveService = require('../services/driveService');

// Route POST : /api/documents/upload
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { patientName, docType } = req.body;
    const file = req.req.file; // Multer met le fichier ici

    if (!file) return res.status(400).json({ message: "Aucune image envoyée" });

    // Envoi vers Google Drive
    const result = await driveService.uploadToDrive(file, patientName, docType);

    res.json({ message: "Document sauvegardé sur Drive", link: result.webViewLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'envoi vers Drive", error: err.message });
  }
});

module.exports = router;