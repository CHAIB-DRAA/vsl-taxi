const Patient = require('../models/Patient');

// 1. Récupérer tous mes patients (Créés PAR moi OU Partagés AVEC moi)
exports.getPatients = async (req, res) => {
  try {
    const userId = req.user.id;

    // 👇 LA CORRECTION EST ICI
    const patients = await Patient.find({
      $or: [
        { chauffeurId: userId },       // Cas 1 : C'est mon patient
        { sharedWith: userId }         // Cas 2 : On me l'a partagé
      ]
    }).sort({ fullName: 1 });

    res.json(patients);
  } catch (err) {
    console.error("Erreur getPatients:", err);
    res.status(500).json({ message: "Erreur serveur récupération patients" });
  }
};

// 2. Créer un nouveau patient
exports.createPatient = async (req, res) => {
  try {
    const { fullName, address, phone } = req.body;

    if (!fullName) return res.status(400).json({ message: "Le nom est obligatoire" });

    const newPatient = new Patient({
      chauffeurId: req.user.id, // Tu es le propriétaire
      fullName,
      address,
      phone,
      sharedWith: [] // Initialise le tableau vide
    });

    await newPatient.save();
    res.status(201).json(newPatient);
  } catch (err) {
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