const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

// --- FONCTION DE SECOURS INTELLIGENTE (V2) ---
const parseWithRegex = (text) => {
    const result = {
      patientName: '', patientPhone: '', startLocation: '', endLocation: '',
      date: new Date().toISOString(), type: 'Aller', notes: text
    };
  
    // 1. TÉLÉPHONE (Format plus souple : 06 12 34 56 78 ou 06.12...)
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.patientPhone = phoneMatch[0].replace(/\s/g, '').replace(/\./g, '');
        // On retire le téléphone du texte pour ne pas le confondre avec une adresse
        text = text.replace(phoneMatch[0], '');
    }
  
    // 2. HEURE (14h30, 14:30, 14h)
    const timeRegex = /(\d{1,2})[hH:]?(\d{2})?/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const d = new Date();
      // Si on trouve une heure, on l'applique à la date d'aujourd'hui
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      d.setHours(hours, minutes, 0, 0);
      result.date = d.toISOString();
    }
  
    // 3. ADRESSES & NOM (Logique par déduction)
    // On nettoie le texte (enlève l'heure trouvée)
    if (timeMatch) text = text.replace(timeMatch[0], '');
    
    // On découpe le reste
    const parts = text.split(/[\n\/-]/).map(p => p.trim()).filter(p => p.length > 2);
    
    // On essaie de classer les morceaux restants
    let addressesFound = [];
    
    parts.forEach(part => {
        const lower = part.toLowerCase();
        
        // Mots clés explicites
        if (lower.includes('dep') || lower.startsWith('de ')) {
            result.startLocation = part.replace(/dep[:.]?|de /i, '').trim();
        } 
        else if (lower.includes('dest') || lower.includes('pour ') || lower.startsWith('à ') || lower.includes('vers ')) {
            result.endLocation = part.replace(/dest[:.]?|pour |vers |à /i, '').trim();
        } 
        // Si ça ressemble à un nom (Mme, Mr, ou pas de chiffre)
        else if ((lower.includes('mme') || lower.includes('mr') || lower.includes('m.')) && !result.patientName) {
            result.patientName = part;
        }
        // Sinon, c'est probablement une adresse ou un nom non identifié
        else {
            addressesFound.push(part);
        }
    });

    // 4. BOUCHE-TROUS (Si on n'a pas trouvé avec les mots clés)
    if (addressesFound.length > 0) {
        // S'il nous manque le nom
        if (!result.patientName) result.patientName = addressesFound[0];
        
        // S'il nous manque les adresses, on prend les morceaux suivants
        else if (!result.startLocation) result.startLocation = addressesFound[0];
        else if (!result.endLocation) result.endLocation = addressesFound[0];
        
        if (addressesFound.length > 1 && !result.endLocation) result.endLocation = addressesFound[1];
    }
    
    return result;
};

// --- ROUTE PRINCIPALE ---
router.post('/parse-ride', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  try {
    // On tente l'IA (Si tu as payé les 5$)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
          { role: "system", content: "Tu es un extracteur de données JSON strict." },
          { role: "user", content: `Extrait JSON (patientName, patientPhone, startLocation, endLocation, date (ISO)) de : "${text}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);

  } catch (error) {
    console.warn("⚠️ Mode Manuel activé (Regex)");
    const manualResult = parseWithRegex(text);
    res.json({ ...manualResult, source: 'manual_fallback' });
  }
});

module.exports = router;