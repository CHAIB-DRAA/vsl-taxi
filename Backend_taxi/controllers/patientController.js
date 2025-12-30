const Patient = require('../models/Patient');

// 1. Récupérer tous mes patients
exports.getPatients = async (req, res) => {
  try {
    // On ne récupère que les patients créés par CE chauffeur (req.user.id)
    const patients = await Patient.find({ chauffeurId: req.user.id }).sort({ fullName: 1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Créer un nouveau patient
exports.createPatient = async (req, res) => {
  try {
    const { fullName, address, phone } = req.body;

    if (!fullName) return res.status(400).json({ message: "Le nom est obligatoire" });

    const newPatient = new Patient({
      chauffeurId: req.user.id, // On l'associe à toi
      fullName,
      address,
      phone
    });

    await newPatient.save();
    res.status(201).json(newPatient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ... getPatients et createPatient existants ...

// 3. Modifier un patient
exports.updatePatient = async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // On s'assure que c'est bien TON patient (chauffeurId)
      const patient = await Patient.findOneAndUpdate(
        { _id: id, chauffeurId: req.user.id },
        { $set: updates },
        { new: true } // Renvoie la version modifiée
      );
  
      if (!patient) return res.status(404).json({ message: "Patient introuvable" });
      res.json(patient);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
  // 4. Supprimer un patient
  exports.deletePatient = async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await Patient.findOneAndDelete({ _id: id, chauffeurId: req.user.id });
      
      if (!patient) return res.status(404).json({ message: "Patient introuvable" });
      res.json({ message: "Patient supprimé" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };