const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: String,
  address: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 👈 AJOUT : Liste des collègues qui ont le droit de voir ce patient
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
});

module.exports = mongoose.model('Patient', PatientSchema);