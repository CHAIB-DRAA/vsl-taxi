const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  supabase_user_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // crée automatiquement createdAt et updatedAt
});

module.exports = mongoose.model('Driver', userSchema);
