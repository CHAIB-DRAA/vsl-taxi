const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  type: { type: String, enum: ['Aller', 'Retour'], required: true },
  date: { type: Date, required: true },
  chauffeurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chauffeur' }
});


module.exports = mongoose.model('Ride', rideSchema);
