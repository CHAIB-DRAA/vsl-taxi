const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Pour générer le token
const User = require('../models/User'); // Import du modèle User
const sendEmail = require('../utils/emailService'); // Import du service Email

// Import de vos contrôleurs existants
const { 
    signupUser, 
    loginUser, 
    getUsers, 
    addContact, 
    searchUsers,
    getProfile,
    updateProfile
} = require('../controllers/userController');

const authMiddleware = require('../middleware/auth');

// ==========================================
// 1. VOS ROUTES EXISTANTES (CONTROLLERS)
// ==========================================
router.post('/signup', signupUser);
router.post('/login', loginUser);

// Routes protégées
router.get('/users', authMiddleware, getUsers);
router.post('/addContact', authMiddleware, addContact);
router.get('/search', authMiddleware, searchUsers);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

// ==========================================
// 2. NOUVELLES ROUTES SÉCURITÉ (DIRECTES)
// ==========================================

// --- MOT DE PASSE OUBLIÉ (Demande) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log("📨 Demande Reset pour :", email);

    try {
        // Recherche insensible à la casse
        const user = await User.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });

        if (!user) {
            // On renvoie 404 pour que le frontend sache qu'il n'y a pas de compte
            return res.status(404).json({ message: "Aucun compte avec cet email." });
        }

        // Générer le token
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();

        // Sauvegarder le token + expiration (1h)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save(); // Le mot de passe ne sera pas re-haché si pas modifié

        // Envoyer l'email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Code de réinitialisation Taxi App',
                message: `Votre code est : ${resetToken}`,
                token: resetToken
            });
            res.json({ message: 'Email envoyé ! Vérifiez vos spams.' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// --- RÉINITIALISER LE MOT DE PASSE (Validation) ---
router.post('/reset-password', async (req, res) => {
    const { resetToken, newPassword } = req.body;

    try {
        // Chercher l'utilisateur avec ce token ET date valide
        const user = await User.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Code invalide ou expiré.' });
        }

        // Mise à jour du mot de passe
        // IMPORTANT : On assigne le mot de passe en clair.
        // Le "pre('save')" dans votre modèle User.js va le hacher automatiquement.
        user.password = newPassword;
        
        // Nettoyage
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Mot de passe modifié avec succès ! Connectez-vous.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;