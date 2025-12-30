const mongoose = require('mongoose');

const documentSchema = mongoose.Schema({
  patientName: { type: String, required: true },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }, // <-- NOUVEAU
  type: { type: String, required: true }, // PMT, CarteVitale, Mutuelle
  imageData: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);