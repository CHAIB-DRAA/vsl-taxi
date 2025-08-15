const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  patientName: { type: String, required: true },
  date: { type: Date, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  type: { type: String },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  distance: { type: Number, default: 0 },
  status: { type: String, default: 'Non facturé' }
});

module.exports = mongoose.model('Ride', rideSchema);
