const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateUser } = require('../middleware/auth'); // Assure-toi d’avoir un middleware pour auth

// === Courses classiques
router.post('/', authenticateUser, rideController.createRide);
router.get('/', authenticateUser, rideController.getRides);        // Récupérer toutes les courses
router.put('/:id', authenticateUser, rideController.updateRide);   // Mettre à jour une course
router.delete('/:id', authenticateUser, rideController.deleteRide);// Supprimer une course

// === Gestion du statut
router.post('/:id/start', authenticateUser, rideController.startRide); // Démarrer une course
router.post('/:id/end', authenticateUser, rideController.endRide);     // Terminer une course

// === Partage de course
router.post('/share', authenticateUser, rideController.shareRide);        // Partager une course
router.post('/share/respond', authenticateUser, rideController.respondToShare); // Accepter/refuser un partage

module.exports = router;
