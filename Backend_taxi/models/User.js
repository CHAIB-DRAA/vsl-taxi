const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // AJOUTE CE CHAMP :
  pushToken: { type: String, default: '' }, // L'adresse pour envoyer la notif

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);