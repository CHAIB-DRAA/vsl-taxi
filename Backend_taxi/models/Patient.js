const mongoose = require('mongoose');

const patientSchema = mongoose.Schema({
  // Le patient appartient à un chauffeur spécifique (toi)
  chauffeurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  fullName: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  
  // Tu pourras ajouter plus tard : numéro sécu, mutuelle, etc.
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);