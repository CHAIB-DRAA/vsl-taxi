const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/auth');

// CRUD / actions
router.get('/', authMiddleware , rideController.getRides);
router.post('/', authMiddleware , rideController.createRide);
router.put('/:id', authMiddleware , rideController.updateRide);
router.delete('/:id', authMiddleware , rideController.deleteRide);

// Partage & réponse
router.post('/share', authMiddleware , rideController.shareRide);
router.post('/respond', authMiddleware , rideController.respondRideShare);

// Démarrer / terminer (si tu les utilises)
router.post('/:id/start', authMiddleware , rideController.startRide);
router.post('/:id/end', authMiddleware , rideController.endRide);

module.exports = router;
