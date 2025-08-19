const mongoose = require('mongoose');

const rideShareSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true }, // Course partagée
  fromUserId: { type: String, required: true }, // Celui qui partage
  toUserId: { type: String, required: true },   // Destinataire
  sharedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RideShare', rideShareSchema);
