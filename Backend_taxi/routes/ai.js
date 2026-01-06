const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

// --- FONCTION DE SECOURS (REGEX) ---
// C'est ton ancien cerveau manuel, il servira de roue de secours
const parseWithRegex = (text) => {
    const result = {
      patientName: '', patientPhone: '', startLocation: '', endLocation: '',
      date: new Date().toISOString(), type: 'Aller', notes: text
    };
  
    // Téléphone
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) result.patientPhone = phoneMatch[0].replace(/\s/g, '').replace(/\./g, '');
  
    // Heure
    const timeRegex = /(\d{1,2})[hH:](\d{2})/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const d = new Date();
      d.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
      result.date = d.toISOString();
    }
  
    // Adresses (Basique)
    const parts = text.split(/[\n-]/).map(p => p.trim()).filter(p => p.length > 0);
    parts.forEach(part => {
        const lower = part.toLowerCase();
        if (lower.includes('dep') || lower.startsWith('de ')) result.startLocation = part;
        else if (lower.includes('dest') || lower.includes('pour ') || lower.startsWith('à ')) result.endLocation = part;
        else if (!result.patientName && !part.match(/\d/) && part.length > 3) result.patientName = part;
    });
    
    return result;
};
// -----------------------------------

router.post('/parse-ride', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  try {
    console.log("🤖 Tentative analyse IA...");
    
    // TENTATIVE 1 : OPENAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
          { role: "system", content: "Tu es un extracteur de données JSON strict pour taxi." },
          { role: "user", content: `Extrait en JSON (patientName, patientPhone, startLocation, endLocation, date (ISO), type) de : "${text}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log("✅ Succès IA");
    res.json(result);

  } catch (error) {
    // TENTATIVE 2 : SECOURS
    console.warn("⚠️ Échec IA (Quota ou Panne). Passage en mode Manuel (Regex).");
    console.error("Détail erreur:", error.message);

    // On ne renvoie PAS d'erreur 500, on renvoie le résultat manuel !
    const manualResult = parseWithRegex(text);
    
    // On ajoute un petit flag pour dire au front que c'est du manuel (optionnel)
    res.json({ ...manualResult, source: 'manual_fallback' });
  }
});

module.exports = router;