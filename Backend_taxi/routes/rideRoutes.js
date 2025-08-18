const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const supabaseAuth = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(supabaseAuth);

// Routes CRUD
router.post('/', rideController.createRide);         // Créer une course
router.get('/', rideController.getRides);           // Récupérer les courses
router.patch('/:id', rideController.updateRide);    // Mettre à jour le statut général

// Routes spécifiques pour démarrer et terminer une course
router.patch('/start/:id', rideController.startRide); // Démarrer une course
router.patch('/end/:id', rideController.endRide);     // Terminer une course

module.exports = router;
