const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

// --- 1. MOTEUR DE SECOURS (REGEX) ---
// Si l'IA échoue, on utilise ce code "bête mais robuste"
const parseWithRegex = (text) => {
    const result = {
      patientName: '', patientPhone: '', startLocation: '', endLocation: '',
      date: new Date().toISOString(), type: 'Aller', notes: text
    };
  
    // Téléphone
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.patientPhone = phoneMatch[0].replace(/\s/g, '').replace(/\./g, '');
        text = text.replace(phoneMatch[0], ''); // On l'enlève pour pas gêner la suite
    }
  
    // Heure (ex: 14h30)
    const timeRegex = /(\d{1,2})[hH:]?(\d{2})?/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const d = new Date();
      d.setHours(parseInt(timeMatch[1]), timeMatch[2] ? parseInt(timeMatch[2]) : 0, 0, 0);
      result.date = d.toISOString();
    }
  
    // Adresses & Nom (Déduction simple)
    const parts = text.split(/[\n\/-]/).map(p => p.trim()).filter(p => p.length > 2);
    let addresses = [];

    parts.forEach(part => {
        const lower = part.toLowerCase();
        if (lower.includes('dep') || lower.startsWith('de ')) result.startLocation = part;
        else if (lower.includes('dest') || lower.includes('pour ') || lower.startsWith('à ')) result.endLocation = part;
        else if ((lower.includes('mme') || lower.includes('mr')) && !result.patientName) result.patientName = part;
        else addresses.push(part);
    });

    // Bouche-trous
    if (addresses.length > 0) {
        if (!result.patientName) result.patientName = addresses[0];
        else if (!result.startLocation) result.startLocation = addresses[0];
        else if (!result.endLocation) result.endLocation = addresses[0];
    }
    
    return result;
};

// --- 2. ROUTE PRINCIPALE ---
router.post('/parse-ride', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  console.log("📝 Analyse reçue :", text); // LOG 1

  try {
    // TENTATIVE IA
    const prompt = `
      Analyse ce texte de transport médical : "${text}"
      Date réf : ${new Date().toISOString()}

      Règles :
      1. Trouve les courses.
      2. Type STRICT : 'Aller', 'Retour' ou 'Consultation'.
      3. Réponds JSON : { "rides": [ { "patientName": "...", "patientPhone": "...", "startLocation": "...", "endLocation": "...", "date": "...", "type": "..." } ] }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
          { role: "system", content: "Expert JSON logistique." },
          { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const rawContent = completion.choices[0].message.content;
    console.log("🤖 Réponse IA brute :", rawContent); // LOG 2 : On voit ce que l'IA renvoie

    const result = JSON.parse(rawContent);
    
    // Sécurité Types
    const validTypes = ['Aller', 'Retour', 'Consultation', 'Taxi', 'VSL', 'Ambulance'];
    const safeRides = (result.rides || []).map(r => {
        let t = r.type;
        if (t === 'Pec' || t === 'Départ') t = 'Aller';
        if (t === 'Récupération') t = 'Retour';
        return { ...r, type: validTypes.includes(t) ? t : 'Aller' };
    });

    // Si l'IA renvoie une liste vide (bug), on déclenche l'erreur pour passer au manuel
    if (safeRides.length === 0) throw new Error("IA a renvoyé une liste vide");

    res.json(safeRides);

  } catch (error) {
    console.error("⚠️ IA Échec/Erreur -> Passage Manuel. Raison :", error.message);
    
    // RECOURS AU MANUEL
    const manualResult = parseWithRegex(text);
    // On renvoie un tableau contenant le résultat manuel
    res.json([manualResult]);
  }
});

module.exports = router;