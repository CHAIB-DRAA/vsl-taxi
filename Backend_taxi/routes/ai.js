const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Protection par mot de passe (Token)
router.use(authMiddleware);

// Route d'analyse
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
      - Si c'est une prise en charge (PEC), un départ, ou un aller simple -> Choisis 'Aller'.
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
    
    // 👇 SÉCURITÉ JAVASCRIPT (FILET DE SECOURS)
    const validTypes = ['Aller', 'Retour', 'Consultation', 'Taxi', 'VSL', 'Ambulance'];
    
    const safeRides = (result.rides || []).map(r => {
        let cleanType = r.type;
        
        // Correction manuelle des erreurs fréquentes de l'IA
        if (cleanType === 'Pec' || cleanType === 'Départ') cleanType = 'Aller';
        if (cleanType === 'Récupération') cleanType = 'Retour';

        return {
            ...r,
            // Si le type n'est toujours pas dans la liste, on met 'Aller' par défaut
            type: validTypes.includes(cleanType) ? cleanType : 'Aller'
        };
    });

    res.json(safeRides);

  } catch (error) {
    console.error("Erreur IA:", error);
    // Fallback manuel
    res.json([{ notes: text, source: 'error_fallback', type: 'Aller' }]);
  }
});

module.exports = router;