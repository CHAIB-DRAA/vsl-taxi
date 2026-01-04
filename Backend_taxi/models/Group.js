const mongoose = require('mongoose');

const dispatchSchema = mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 👇 C'EST ICI LA CORRECTION ! (C'était sûrement String avant)
  targetGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dispatch', dispatchSchema);