const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import des routes
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const docRoutes = require('./routes/docRoutes');
const patientRoutes = require('./routes/patientRoutes');
const shareRoutes = require('./routes/shareRoutes'); 
const dispatchRoutes = require('./routes/dispatch'); 
const groupRoutes = require('./routes/groups');      

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connecté à MongoDB'))
.catch((err) => console.error('❌ Erreur de connexion à MongoDB :', err));

// Définition des Routes
app.use('/api/rides', rideRoutes);
app.use('/api/user', userRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/share', shareRoutes);

// 👇 MODIFICATION ICI : On a retiré 'authMiddleware'
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/groups', groupRoutes);
// 👆 Le serveur est plus propre, la sécurité est gérée "à l'intérieur" des fichiers routes

app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server is alive 🤖');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});