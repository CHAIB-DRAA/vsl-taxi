const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'PMT', 'CarteVitale', 'Mutuelle'
  imageData: { type: String, required: true }, // Base64 ou URL
  uploadDate: { type: Date, default: Date.now },
  
  // Liens
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }, // Lien historique
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, // 👈 AJOUT IMPORTANT
  
  // Pour savoir à qui appartient le doc à la base
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Document', DocumentSchema);