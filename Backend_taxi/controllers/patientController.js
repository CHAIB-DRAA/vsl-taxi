const Patient = require('../models/Patient');

/const mongoose = require('mongoose'); // 👈 N'oublie pas cet import en haut
const Patient = require('../models/Patient');

exports.getPatients = async (req, res) => {
  try {
    // 1. Vérification de sécurité
    if (!req.user || !req.user.id) {
      console.log("❌ Pas de user dans la requête");
      return res.status(401).json({ message: "Utilisateur non connecté" });
    }

    // 2. Conversion de l'ID en ObjectId MongoDB
    // C'est souvent ici que ça bloque : String vs ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    console.log("🔍 Recherche des patients pour l'ID :", userId);

    // 3. La Requête
    const patients = await Patient.find({
      $or: [
        { chauffeurId: userId },       // Je suis le créateur
        { sharedWith: userId }         // On me l'a partagé
      ]
    }).sort({ fullName: 1 });

    console.log(`✅ ${patients.length} patients trouvés`);

    res.json(patients);

  } catch (err) {
    console.error("❌ Erreur getPatients:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

// 2. Créer un nouveau patient
exports.createPatient = async (req, res) => {
  try {
    // 1. Vérification de sécurité
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Utilisateur non authentifié ou ID manquant" });
    }

    const { fullName, address, phone } = req.body;

    if (!fullName) return res.status(400).json({ message: "Le nom est obligatoire" });

    // 2. Création avec le chauffeurId explicite
    const newPatient = new Patient({
      chauffeurId: req.user.id, // 👈 C'est ça qui manquait dans ta base
      fullName,
      address,
      phone,
      sharedWith: [] 
    });

    await newPatient.save();
    res.status(201).json(newPatient);

  } catch (err) {
    console.error("Erreur création patient:", err);
    res.status(500).json({ message: err.message });
  }
};

// 3. Modifier un patient
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // On autorise la modif si je suis le créateur OU si on me l'a partagé
    const patient = await Patient.findOne({
      _id: id,
      $or: [{ chauffeurId: userId }, { sharedWith: userId }]
    });

    if (!patient) return res.status(404).json({ message: "Patient introuvable ou accès refusé" });

    // Mise à jour des champs
    Object.assign(patient, updates);
    await patient.save();

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Supprimer un patient
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // IMPORTANT : Seul le CRÉATEUR peut supprimer définitivement le patient
    // Si c'est un patient partagé, on ne peut pas le supprimer (pour l'instant)
    const patient = await Patient.findOneAndDelete({ 
      _id: id, 
      chauffeurId: req.user.id 
    });
    
    if (!patient) return res.status(403).json({ message: "Impossible de supprimer : Vous n'êtes pas le propriétaire ou patient introuvable." });
    
    res.json({ message: "Patient supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};