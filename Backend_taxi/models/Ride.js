const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  date: { type: Date, required: true },          // Utiliser Date pour la course
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  type: { type: String },
  startTime: { type: Date, default: null },       // Heure de démarrage
  endTime: { type: Date, default: null },         // Heure de fin
  distance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Ride', rideSchema);
