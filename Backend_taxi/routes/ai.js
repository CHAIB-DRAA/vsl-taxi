const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient'); // 👈 IMPORT DU MODÈLE PATIENT

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

// --- 1. MOTEUR DE SECOURS (REGEX) ---
const parseWithRegex = (text) => {
    const result = {
      patientName: '', patientPhone: '', startLocation: '', endLocation: '',
      date: new Date().toISOString(), type: 'Aller', notes: text
    };
  
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.patientPhone = phoneMatch[0].replace(/\s/g, '').replace(/\./g, '');
        text = text.replace(phoneMatch[0], '');
    }
  
    const timeRegex = /(\d{1,2})[hH:]?(\d{2})?/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const d = new Date();
      d.setHours(parseInt(timeMatch[1]), timeMatch[2] ? parseInt(timeMatch[2]) : 0, 0, 0);
      result.date = d.toISOString();
    }
  
    const parts = text.split(/[\n\/-]/).map(p => p.trim()).filter(p => p.length > 2);
    let addresses = [];
    parts.forEach(part => {
        const lower = part.toLowerCase();
        if (lower.includes('dep') || lower.startsWith('de ')) result.startLocation = part;
        else if (lower.includes('dest') || lower.includes('pour ') || lower.startsWith('à ')) result.endLocation = part;
        else if ((lower.includes('mme') || lower.includes('mr')) && !result.patientName) result.patientName = part;
        else addresses.push(part);
    });

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

  console.log("📝 Analyse IA + DB pour :", text);

  try {
    // A. APPEL OPENAI
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

    const result = JSON.parse(completion.choices[0].message.content);
    
    // B. NETTOYAGE & ENRICHISSEMENT AVEC LA BDD
    const validTypes = ['Aller', 'Retour', 'Consultation', 'Taxi', 'VSL', 'Ambulance'];
    
    // On utilise Promise.all pour faire les recherches DB en parallèle
    const enrichedRides = await Promise.all((result.rides || []).map(async (r) => {
        // 1. Correction du Type
        let t = r.type;
        if (t === 'Pec' || t === 'Départ') t = 'Aller';
        if (t === 'Récupération') t = 'Retour';
        const finalType = validTypes.includes(t) ? t : 'Aller';

        // 2. Recherche du Patient en BDD 🔍
        let dbPatient = null;
        let finalPhone = r.patientPhone;
        let finalName = r.patientName;

        if (r.patientName && r.patientName.length > 2) {
            // On nettoie le nom (ex: "Mme Martin" -> "Martin") pour la recherche
            const cleanSearchName = r.patientName.replace(/mme|mr|m\.|monsieur|madame/gi, '').trim();
            
            // Recherche "fuzzy" (qui contient le nom) insensible à la casse
            dbPatient = await Patient.findOne({
                $or: [
                    { fullName: { $regex: cleanSearchName, $options: 'i' } }, // Recherche par nom
                    { phone: r.patientPhone } // Ou par téléphone si l'IA l'a trouvé
                ]
            });

            if (dbPatient) {
                console.log(`✅ Patient reconnu en base : ${dbPatient.fullName}`);
                // Si l'IA n'a pas trouvé de téléphone, on prend celui de la base
                if (!finalPhone) finalPhone = dbPatient.phone;
                // On normalise le nom avec celui de la base (plus propre)
                finalName = dbPatient.fullName;
            }
        }

        return {
            ...r,
            patientName: finalName,
            patientPhone: finalPhone,
            type: finalType,
            // On ajoute un petit flag pour le debug
            fromDb: !!dbPatient
        };
    }));

    if (enrichedRides.length === 0) throw new Error("IA vide");

    res.json(enrichedRides);

  } catch (error) {
    console.error("⚠️ Erreur IA, passage manuel:", error.message);
    const manualResult = parseWithRegex(text);
    res.json([manualResult]);
  }
});

module.exports = router;