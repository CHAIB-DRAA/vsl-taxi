const mongoose = require('mongoose');

const rideShareSchema = new mongoose.Schema({
  rideId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ride', 
    required: true 
  }, // Course partagée
  fromUserId: { 
    type: String, 
    required: true 
  }, // Celui qui partage
  toUserId: { 
    type: String, 
    required: true 
  }, // Destinataire
  statusPartage: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'], 
    default: 'pending' 
  } // Statut du partage
}, {
  timestamps: true // createdAt et updatedAt automatiques
});

module.exports = mongoose.model('RideShare', rideShareSchema);
