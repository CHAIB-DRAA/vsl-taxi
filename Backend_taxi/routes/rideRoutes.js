const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const supabaseAuth = require('../middleware/auth');

router.use(supabaseAuth); // toutes les routes nécessitent authentification

router.post('/', rideController.createRide);
router.get('/', rideController.getRides);
router.patch('/:id', rideController.updateRide);
router.patch('/:id/start', rideController.startRide);
router.patch('/:id/end', rideController.endRide);
router.post('/shareRide', rideController.shareRide); // ✅ doit être une fonction



module.exports = router;
