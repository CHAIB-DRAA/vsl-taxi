const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient'); // Assure-toi que le modèle existe bien ici

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

// --- 1. DICTIONNAIRE DES LIEUX (A compléter selon ta zone) ---
// Mets ici les raccourcis que tu utilises souvent
const KNOWN_LOCATIONS = {
    "oncopole": "1 Avenue Irène Joliot-Curie, 31100 Toulouse",
    "purpan": "Place du Dr Baylac, 31300 Toulouse",
    "rangueil": "1 Avenue du Professeur Jean Poulhès, 31400 Toulouse",
    "pasteur": "45 Avenue de Lombez, 31300 Toulouse",
    "cedres": "Château d'Alliez, 31700 Cornebarrieu",
    "croix du sud": "52 Chemin de Ribaute, 31130 Quint-Fonsegrives",
    "ducuing": "15 Rue de Varsovie, 31300 Toulouse",
    "gare": "Gare Matabiau, 64 Boulevard Pierre Semard, 31000 Toulouse",
    "airport": "Aéroport Toulouse-Blagnac, 31700 Blagnac"
};

// Fonction pour normaliser et trouver une adresse connue
const findRealAddress = (input) => {
    if (!input) return "";
    const lower = input.toLowerCase();
    
    // On cherche si un mot clé (ex: "oncopole") est dans le texte
    for (const [key, address] of Object.entries(KNOWN_LOCATIONS)) {
        if (lower.includes(key)) {
            return address; // On remplace par l'adresse complète
        }
    }
    return input; // Sinon on garde ce que l'IA a trouvé
};

// --- 2. ROUTE PRINCIPALE ---
router.post('/parse-ride', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texte manquant" });

  try {
    // A. APPEL OPENAI
    const prompt = `
      Analyse ce texte de transport médical : "${text}"
      Date réf : ${new Date().toISOString()}

      Règles :
      1. Trouve les courses.
      2. Type STRICT : 'Aller', 'Retour' ou 'Consultation'.
      3. Si "Domicile" ou "Chez lui", mets "DOMICILE" dans l'adresse.
      4. Réponds JSON : { "rides": [ { "patientName": "...", "patientPhone": "...", "startLocation": "...", "endLocation": "...", "date": "...", "type": "..." } ] }
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
    
    // B. ENRICHISSEMENT (Hôpitaux + Base de Données)
    const validTypes = ['Aller', 'Retour', 'Consultation', 'Taxi', 'VSL', 'Ambulance'];
    
    const enrichedRides = await Promise.all((result.rides || []).map(async (r) => {
        
        // 1. Correction du Type
        let t = r.type;
        if (t === 'Pec' || t === 'Départ') t = 'Aller';
        if (t === 'Récupération') t = 'Retour';
        const finalType = validTypes.includes(t) ? t : 'Aller';

        // 2. Correction des Adresses (Hôpitaux connus) 🏥
        let start = findRealAddress(r.startLocation);
        let end = findRealAddress(r.endLocation);

        // 3. Recherche du Patient en BDD (Pour Adresse & Tel) 🔍
        let finalPhone = r.patientPhone;
        let finalName = r.patientName;
        
        // On ne cherche que si on a un nom d'au moins 3 lettres (évite de trouver "Moi" ou le chauffeur)
        if (r.patientName && r.patientName.length > 2) {
            const cleanSearchName = r.patientName.replace(/mme|mr|m\.|monsieur|madame/gi, '').trim();
            
            if (cleanSearchName.length >= 3) {
                // Recherche stricte sur le nom ou le téléphone
                const dbPatient = await Patient.findOne({
                    $or: [
                        { fullName: { $regex: new RegExp(`^${cleanSearchName}`, 'i') } }, // Commence par le nom (plus précis)
                        { phone: r.patientPhone }
                    ]
                });

                if (dbPatient) {
                    console.log(`✅ Patient trouvé : ${dbPatient.fullName}`);
                    finalName = dbPatient.fullName; // On met le vrai nom complet
                    
                    // Si pas de téléphone dans le message, on prend celui du dossier
                    if (!finalPhone) finalPhone = dbPatient.phone;

                    // LOGIQUE D'ADRESSE INTELLIGENTE 🏠
                    // Si c'est un ALLER et que le départ est vide ou "DOMICILE"
                    if (finalType === 'Aller' && (!start || start.toUpperCase().includes('DOMICILE'))) {
                        start = dbPatient.address || start;
                    }
                    // Si c'est un RETOUR et que l'arrivée est vide ou "DOMICILE"
                    if (finalType === 'Retour' && (!end || end.toUpperCase().includes('DOMICILE'))) {
                        end = dbPatient.address || end;
                    }
                }
            }
        }

        return {
            ...r,
            patientName: finalName,
            patientPhone: finalPhone,
            startLocation: start,
            endLocation: end,
            type: finalType
        };
    }));

    res.json(enrichedRides);

  } catch (error) {
    console.error("⚠️ Erreur IA:", error.message);
    // Fallback simple pour ne pas bloquer
    res.json([{ notes: text, source: 'error_fallback', type: 'Aller' }]);
  }
});

module.exports = router;