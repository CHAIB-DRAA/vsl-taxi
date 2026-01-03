const mongoose = require('mongoose');

const DispatchSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Soit un groupe, soit un utilisateur spécifique
  targetGroupId: { type: String, default: null }, 
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // S'autodétruit après 24h
});

module.exports = mongoose.model('Dispatch', DispatchSchema);