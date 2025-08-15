const Ride = require('../models/Ride');

exports.createRide = async (req, res) => {
  try {
    const ride = new Ride({ ...req.body, chauffeurId: req.user.id });
    await ride.save();
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndUpdate(req.params.id, { startTime: new Date() }, { new: true });
    res.json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.endRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndUpdate(req.params.id, { endTime: new Date() }, { new: true });
    res.json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find({ chauffeurId: req.user.id }).sort({ date: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRide = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ride) {
      return res.status(404).json({ message: "Course introuvable" });
    }
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
