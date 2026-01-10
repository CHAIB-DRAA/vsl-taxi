const User = require('../models/User');
const bcrypt = require('bcrypt'); // Nécessaire pour le login
const jwt = require('jsonwebtoken');

// Temps d'expiration du token
const TOKEN_EXPIRATION = '7d'; 

// ==========================================
// 1. INSCRIPTION (SIGNUP) - CORRIGÉ ✅
// ==========================================
exports.signupUser = async (req, res) => {
  try {
    const { email, fullName, password } = req.body;
    
    // Validation basique
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // 🛑 MODIFICATION IMPORTANTE ICI :
    // On NE hache PAS le mot de passe manuellement.
    // On laisse le modèle User (et son middleware pre-save) s'en occuper.
    const user = new User({ 
        email, 
        fullName, 
        password // <-- On passe le mot de passe tel quel
    });

    await user.save(); // Le modèle va crypter le mot de passe ici automatiquement

    // Générer le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    res.status(201).json({ 
      message: 'Utilisateur créé avec succès', 
      user: { id: user._id, email: user.email, fullName: user.fullName },
      token
    });
  } catch (err) {
    console.error("Erreur Signup:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 2. CONNEXION (LOGIN)
// ==========================================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe
    // bcrypt.compare va hacher "password" et voir s'il correspond au hash en BDD
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
        return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    res.json({ 
      message: 'Connexion réussie', 
      user: { id: user._id, email: user.email, fullName: user.fullName },
      token
    });
  } catch (err) {
    console.error("Erreur Login:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 3. AUTRES FONCTIONS
// ==========================================

// Récupérer tous les utilisateurs
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ajouter un contact
exports.addContact = async (req, res) => {
  try {
    const { userId, contactId } = req.body;

    // Note: Idéalement, utilisez req.user.id (du token) au lieu de userId du body pour plus de sécurité
    const user = await User.findById(userId);
    const contact = await User.findById(contactId);

    if (!user || !contact) return res.status(404).json({ message: 'Utilisateur introuvable' });

    // Éviter les doublons
    if (!user.contacts.includes(contact._id)) {
      user.contacts.push(contact._id);
      await user.save();
    }

    res.json({ message: 'Contact ajouté', contacts: user.contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rechercher des utilisateurs
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query || query.length < 2) { // J'ai réduit à 2 pour être plus souple
      return res.json([]);
    }

    const regex = new RegExp(query, 'i');
    const users = await User.find({
      $or: [
        { email: regex },
        { fullName: regex }
      ]
    })
    .limit(10)
    .select('_id fullName email');

    res.json(users);
  } catch (err) {
    console.error('❌ Erreur searchUsers:', err);
    res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
};

// Récupérer mon profil
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour mon profil
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Sécurité : On empêche la modif du mot de passe ici 
    // (car elle ne passerait pas par le hashage automatique de mongoose avec findByIdAndUpdate)
    delete updates.password; 

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour" });
  }
};