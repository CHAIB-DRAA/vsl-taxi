// models/Ride.js
const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  date: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  type: { type: String },
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  distance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Ride', rideSchema);
