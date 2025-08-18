require('dotenv').config(); // Important : charger .env en premier
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authMiddleware = async (req, res, next) => {
  try {
    // Récupération du token Bearer
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    // Vérification du token
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Utilisateur non valide' });

    // Injecter l'id Supabase dans req.user
    req.user = { id: data.user.id };
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

module.exports = authMiddleware;
