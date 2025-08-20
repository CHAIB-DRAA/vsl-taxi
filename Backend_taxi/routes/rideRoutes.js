const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/auth'); // si tu as un middleware d’auth

// Toutes les routes utilisent authMiddleware
router.post('/', authMiddleware, rideController.createRide); // ← POST /api/rides
router.get('/', authMiddleware, rideController.getRides);
router.patch('/:id', authMiddleware, rideController.updateRide);
router.delete('/:id', authMiddleware, rideController.deleteRide);
router.post('/:id/start', authMiddleware, rideController.startRide);
router.post('/:id/end', authMiddleware, rideController.endRide);
router.post('/share', authMiddleware, rideController.shareRide);
router.post('/share/respond', authMiddleware, rideController.respondToShare);

module.exports = router;
