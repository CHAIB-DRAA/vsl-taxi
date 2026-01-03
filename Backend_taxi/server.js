const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth');

// Import des routes
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const docRoutes = require('./routes/docRoutes');
const patientRoutes = require('./routes/patientRoutes');
const shareRoutes = require('./routes/shareRoutes'); // 👈 1. IMPORT AJOUTÉ
const dispatchRoutes = require('./routes/dispatch'); // 👈 Import Dispatch
const groupRoutes = require('./routes/groups');      // 👈 Import Groups
// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connecté à MongoDB'))
.catch((err) => console.error('❌ Erreur de connexion à MongoDB :', err));

// Définition des Routes
app.use('/api/rides', rideRoutes);
app.use('/api/user', userRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/share', shareRoutes); // 👈 2. ROUTE ACTIVÉE ICI
app.use('/api/dispatch',authMiddleware, dispatchRoutes);
app.use('/api/groups', authMiddleware,groupRoutes);
// Route de test (Ping)
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server is alive 🤖');
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});