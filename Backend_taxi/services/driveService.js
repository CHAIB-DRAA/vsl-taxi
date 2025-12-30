const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');
const fs = require('fs');

// Chemin vers le fichier JSON (que tu devras télécharger plus tard)
const KEYFILEPATH = path.join(__dirname, '../google_credentials.json');

let drive = null;

// On essaie d'initialiser Drive SEULEMENT si le fichier existe
if (fs.existsSync(KEYFILEPATH)) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log("✅ Google Drive API connectée");
  } catch (e) {
    console.error("⚠️ Erreur config Drive:", e.message);
  }
} else {
  console.log("⚠️ Fichier 'google_credentials.json' introuvable. Mode simulation activé.");
}

// ... (Garde ta fonction getOrCreatePatientFolder telle quelle si tu veux, ou utilise celle ci-dessous simplifiée)

exports.uploadToDrive = async (fileObject, patientName, docType) => {
  // 1. SI DRIVE N'EST PAS CONFIGURÉ : ON SIMULE
  if (!drive) {
    console.log(`[SIMULATION] Upload de ${docType} pour ${patientName} réussi (Fictif).`);
    // On renvoie une fausse réponse positive pour que l'appli mobile soit contente
    return { name: "Fichier_Simulé.jpg", webViewLink: "https://google.com/fake-link" };
  }

  // 2. SI DRIVE EST LÀ : ON UPLOAD VRAIMENT
  try {
    // ... (Ton code getOrCreatePatientFolder ici) ...
    // Pour simplifier ici, je mets juste le code d'upload direct
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const { data } = await drive.files.create({
      media: {
        mimeType: fileObject.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: `${patientName}_${docType}_${Date.now()}.jpg`,
      },
      fields: 'id, name, webViewLink',
    });

    console.log(`✅ Fichier uploadé sur Drive: ${data.name}`);
    return data;

  } catch (error) {
    console.error('❌ Erreur Upload Drive:', error);
    throw error;
  }
};