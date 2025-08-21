const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  chauffeurId: { 
    type: String, // UUID Supabase
    required: true 
  },
  patientName: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  date: { type: Date, required: true },
  isRoundTrip: { type: Boolean, default: false },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  distance: { type: Number, default: null },
  type: { type: String, enum: ['Aller', 'Retour'], default: 'Aller' },
  status: { type: String, enum: ['Non démarrée', 'En cours', 'Terminée'], default: 'Non démarrée' },
  
  // Champs pour le partage
  isShared: { type: Boolean, default: false },         // true si la course est partagée
  sharedBy: {
    type: [String], // tableau de strings
    default: []
  }
  }, {
  timestamps: true // createdAt et updatedAt automatiques
});

module.exports = mongoose.model('Ride', rideSchema);
