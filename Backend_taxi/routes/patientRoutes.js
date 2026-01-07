const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes sont protégées par le login (authMiddleware)
router.use(authMiddleware);
router.get('/search', async (req, res) => {
    try {
      const { query } = req.query;
      console.log("🔍 Recherche Patient reçue :", query); // Log pour vérifier
  
      if (!query || query.length < 2) {
          return res.json([]);
      }
  
      // Recherche insensible à la casse (majuscule/minuscule)
      const patients = await Patient.find({
        fullName: { $regex: query, $options: 'i' }
      })
      .select('fullName phone address email') // On ne récupère que l'utile
      .limit(10); // Max 10 résultats
  
      res.json(patients);
  
    } catch (error) {
      console.error("❌ Erreur Search:", error);
      res.status(500).json({ message: "Erreur lors de la recherche" });
    }
  });
  
  // ==========================================
  // 2. ROUTES CLASSIQUES (CRUD)
  // ==========================================
  
  // Récupérer TOUS les patients
  router.get('/', async (req, res) => {
    try {
      const patients = await Patient.find().sort({ fullName: 1 });
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Récupérer UN patient par ID (Celle qui posait problème si placée avant search)
  router.get('/:id', async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) return res.status(404).json({ message: 'Patient introuvable' });
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);

router.put('/:id', patientController.updatePatient);   
router.delete('/:id', patientController.deletePatient);

module.exports = router;