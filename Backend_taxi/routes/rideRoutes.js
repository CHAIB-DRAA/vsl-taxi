const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/auth');

// 1. Récupération
router.get('/', authMiddleware, rideController.getRides);

// 2. Création
router.post('/', authMiddleware, rideController.createRide);

// 3. MISE À JOUR (C'est ICI la correction)
// On utilise PATCH car le frontend envoie une requête PATCH maintenant.
router.patch('/:id', authMiddleware, rideController.updateRide);

// (On garde PUT pour compatibilité si tu as d'anciens bouts de code qui traînent)
router.put('/:id', authMiddleware, rideController.updateRide);

// 4. Suppression
router.delete('/:id', authMiddleware, rideController.deleteRide);
// 5. Partage & Réponse
router.post('/:rideId/share', rideController.shareRide); // 👈 LA ROUTE MANQUANTE
router.post('/respond', authMiddleware, rideController.respondRideShare);
router.put('/:id/facturation', authMiddleware, rideController.updateRideFacturation);

// 6. Anciennes routes (Tu peux les garder pour l'instant)
//router.post('/:id/start', authMiddleware, rideController.startRide);
//router.post('/:id/end', authMiddleware, rideController.endRide);

module.exports = router;