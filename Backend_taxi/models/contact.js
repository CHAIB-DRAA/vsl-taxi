const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: String, required: true },      // Utilisateur courant
  contactId: { type: String, required: true },   // Utilisateur ajouté
  email: { type: String, required: true },
  fullName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Contact', contactSchema);
