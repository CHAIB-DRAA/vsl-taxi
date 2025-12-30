const mongoose = require('mongoose');

const documentSchema = mongoose.Schema({
  patientName: { type: String, required: true },
  type: { type: String, required: true }, // PMT, Vitale, Mutuelle
  imageData: { type: String, required: true }, // L'image convertie en texte (Base64)
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);