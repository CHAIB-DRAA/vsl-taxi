// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rideRoutes = require('./routes/rideRoutes');

// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Remplace body-parser (inclus depuis Express v4.16+)

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connecté à MongoDB'))
.catch((err) => console.error('❌ Erreur de connexion à MongoDB :', err));

// Routes
app.use('/api/rides', rideRoutes); // Préfixe plus clair

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
	console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
