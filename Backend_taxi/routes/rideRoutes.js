const express = require('express');
const router = express.Router();
const ridesController = require('../controllers/rideController');

// Créer une course
router.post('/create', ridesController.createRide);

// Récupérer toutes les courses
router.get('/', ridesController.getRides);

// Mettre à jour
router.put('/:id', ridesController.updateRide);

// Supprimer
router.delete('/:id', ridesController.deleteRide);

// Démarrer une course
router.post('/:id/start', ridesController.startRide);

// Terminer une course
router.post('/:id/end', ridesController.endRide);

module.exports = router;
