require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Utilisateur non valide' });

    // Injecte l'id Supabase dans req.user
    req.user = { id: data.user.id };
    next();
  } catch (err) {
    console.error('Erreur authMiddleware:', err);
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

module.exports = { authenticateUser };
