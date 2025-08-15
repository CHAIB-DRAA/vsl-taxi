const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const auth = require('../middlewares/auth');

// Obtenir toutes les courses de l'utilisateur connecté
router.get('/', auth, async (req, res) => {
  try {
    const rides = await Ride.find({ chauffeurId: req.user.id }).sort({ date: -1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

// Créer une nouvelle course pour l'utilisateur connecté
router.post('/', auth, async (req, res) => {
  try {
    const newRide = new Ride({ ...req.body, chauffeurId: req.user.id });
    await newRide.save();
    res.status(201).json(newRide);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création de la course', error });
  }
});

// Démarrer une course
router.patch('/:id/start', auth, async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { startTime: new Date() },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: 'Course non trouvée' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du démarrage de la course' });
  }
});

// Finir une course
router.patch('/:id/finish', auth, async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { endTime: new Date(), distance: req.body.distance ?? 10 },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: 'Course non trouvée' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la fin de la course' });
  }
});

// Mettre à jour une course
router.patch('/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      req.body,
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: 'Course non trouvée' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la course' });
  }
});

// Supprimer une course
router.delete('/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, chauffeurId: req.user.id });
    if (!ride) return res.status(404).json({ message: 'Course non trouvée' });
    res.json({ message: 'Course supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la course' });
  }
});

// Mettre à jour le statut
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, chauffeurId: req.user.id },
      { status },
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: 'Course non trouvée' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

module.exports = router;
