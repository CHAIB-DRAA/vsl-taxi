const mongoose = require('mongoose');

const rideSchema = mongoose.Schema({
  chauffeurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['Aller', 'Retour', 'Consultation', 'Autre'], default: 'Aller' },
  isRoundTrip: { type: Boolean, default: false },
  
  // --- NOUVEAUX CHAMPS (Cycle de vie & CPAM) ---
  startTime: { type: Date }, // Heure de clic sur "Démarrer"
  endTime: { type: Date },   // Heure de clic sur "Terminer"
  realDistance: { type: Number }, // Les KM réels saisis à la fin
  tolls: { type: Number, default: 0 }, // Péages
  status: { type: String, default: 'En attente' }, // En attente -> En cours -> Terminée

  // Gestion du partage
  isShared: { type: Boolean, default: false },
  
  // Facturation
  statuFacturation: { type: String, enum: ['Non facturé', 'Facturé'], default: 'Non facturé' }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);