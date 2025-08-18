const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Utilisateur non valide' });

    req.user = { id: user.id }; // ← récupère l'id Supabase
    next();
  } catch (err) {
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

module.exports = authMiddleware;
