require('dotenv').config();
const jwt = require('jsonwebtoken');

// Middleware d'authentification JWT
const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    // Vérifie le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Token invalide' });

    // Injecte l'id de l'utilisateur dans req.user
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('Erreur authMiddleware:', err.message);
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

module.exports = { authenticateUser };
