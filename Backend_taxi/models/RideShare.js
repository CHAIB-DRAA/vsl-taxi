const mongoose = require('mongoose');

const rideShare = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  sharedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'accepted', 'refused'], default: 'pending' }
});


module.exports = mongoose.model('RideShare', rideShare);
