const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id }; // on récupère l'id de l'utilisateur
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = auth;
