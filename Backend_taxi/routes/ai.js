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
      // 👇 PROMPT CORRIGÉ ET STRICT SUR LES TYPES
      const prompt = `
        Analyse le texte suivant (copié de WhatsApp) qui peut contenir UNE ou PLUSIEURS courses de taxi.
        
        Texte : "${text}"
        Date de référence : ${new Date().toISOString()}
  
        Tâche :
        1. Repère chaque course distincte.
        2. Pour chaque course, extrais : patientName, patientPhone, startLocation, endLocation, date (ISO).
        3. Détermine le "type" de la course.
        
        ⚠️ RÈGLE CRUCIALE POUR LE TYPE :
        Tu dois choisir la valeur STRICTEMENT parmi cette liste : ['Aller', 'Retour', 'Consultation'].
        - Si c'est une prise en charge, un départ, ou un aller simple -> Choisis 'Aller'.
        - Si c'est un retour, une récupération, ou "ramener" -> Choisis 'Retour'.
        - Si c'est une attente ou un rdv médical complet -> Choisis 'Consultation'.
        - Ne jamais inventer de terme comme "Pec", "Urgence", etc.
  
        IMPORTANT : Réponds UNIQUEMENT avec un objet JSON contenant un tableau "rides".
        Format attendu :
        {
          "rides": [
            { "patientName": "String", "patientPhone": "String", "startLocation": "String", "endLocation": "String", "date": "ISOString", "type": "String" }
          ]
        }
      `;
  
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "Tu es un assistant expert en logistique qui respecte strictement les énumérations JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });
  
      const result = JSON.parse(completion.choices[0].message.content);
      
      // Sécurité supplémentaire : On force le type si l'IA s'est quand même trompée
      const validTypes = ['Aller', 'Retour', 'Consultation', 'Taxi', 'VSL', 'Ambulance'];
      const safeRides = (result.rides || []).map(r => ({
          ...r,
          // Si le type renvoyé n'est pas dans la liste, on met 'Aller' par défaut
          type: validTypes.includes(r.type) ? r.type : 'Aller'
      }));
  
      res.json(safeRides);
  
    } catch (error) {
      console.error("Erreur IA:", error);
      // Fallback manuel
      res.json([{ notes: text, source: 'error_fallback', type: 'Aller' }]);
    }
  });

module.exports = router;