const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Le créateur (Toi)
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }], // Liste des IDs des contacts
  createdAt: { type: Date, default: Date.now }//tresskjgfhfg
});

module.exports = mongoose.model('Group', GroupSchema);