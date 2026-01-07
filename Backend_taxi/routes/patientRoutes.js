const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes sont protégées par le login (authMiddleware)
router.use(authMiddleware);
router.get('/search', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) return res.json([]);
  
      // Recherche insensible à la casse (Majuscule/Minuscule)
      const patients = await Patient.find({
        fullName: { $regex: query, $options: 'i' }
      }).limit(5); // On limite à 5 résultats pour ne pas surcharger
  
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Erreur recherche" });
    }
  });
router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);

router.put('/:id', patientController.updatePatient);   
router.delete('/:id', patientController.deletePatient);

module.exports = router;