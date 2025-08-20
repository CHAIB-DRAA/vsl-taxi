const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  supabaseId: { type: String, required: true, unique: true }, // ID Supabase
  email: { type: String, required: true, unique: true },
  fullName: { type: String },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
