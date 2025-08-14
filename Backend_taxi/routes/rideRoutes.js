// routes/rideRoutes.js
const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');

// Obtenir toutes les courses
router.get('/', async (req, res) => {
  try {
    const rides = await Ride.find();
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

// Créer une nouvelle course
router.post('/', async (req, res) => {
  try {
    const newRide = new Ride(req.body);
    await newRide.save();
    res.status(201).json(newRide);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création de la course', error });
  }
});
// PATCH /api/rides/:id/start - Démarrer une course
router.patch('/:id/start', async (req, res) => {
    try {
      const updatedRide = await Ride.findByIdAndUpdate(
        req.params.id,
        { startTime: new Date() },
        { new: true }
      );
      res.json(updatedRide);
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors du démarrage de la course' });
    }
  });
  // Obtenir une course par ID
router.get('/:id', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Course non trouvée' });
    }
    res.status(200).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

  
  // PATCH /api/rides/:id/finish - Finir une course
  router.patch('/:id/finish', async (req, res) => {
    try {
      const updatedRide = await Ride.findByIdAndUpdate(
        req.params.id,
        {
          endTime: new Date(),
          distance: req.body.distance ?? 10, // distance fictive
        },
        { new: true }
      );
      res.json(updatedRide);
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la fin de la course' });
    }
  });
  

module.exports = router;
