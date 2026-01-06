const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth'); // On protège la route

// Config OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

router.post('/parse-ride', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) return res.status(400).json({ error: "Texte manquant" });

    const currentDate = new Date().toISOString();

    // LE PROMPT MAGIQUE 🧙‍♂️
    // On explique à l'IA ce qu'on veut exactement.
    const prompt = `
      Tu es un assistant pour un chauffeur de taxi. Analyse le texte suivant copié depuis WhatsApp et extrais les informations de la course.
      
      Texte : "${text}"
      
      Date de référence (aujourd'hui) : ${currentDate}
      
      Règles :
      1. Trouve le nom du patient (patientName).
      2. Trouve le numéro de téléphone (patientPhone) formaté sans espaces.
      3. Trouve le lieu de départ (startLocation) et d'arrivée (endLocation).
      4. Trouve la date et l'heure (date). Si l'heure est donnée mais pas la date, utilise la date d'aujourd'hui. Renvoie au format ISO.
      5. Détermine le type (Aller, Retour, Consultation) selon le contexte.
      
      Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.
      Format attendu :
      {
        "patientName": "String",
        "patientPhone": "String",
        "startLocation": "String",
        "endLocation": "String",
        "date": "ISOString",
        "type": "String"
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modèle rapide et pas cher
      messages: [
          { role: "system", content: "Tu es un extracteur de données JSON strict." },
          { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }, // Force le JSON
      temperature: 0, // 0 = Analyse froide et logique
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log("🤖 IA a extrait :", result);
    res.json(result);

  } catch (error) {
    console.error("Erreur OpenAI:", error);
    res.status(500).json({ error: "Erreur lors de l'analyse IA" });
  }
});

module.exports = router;