const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

// ATTENTION : Tu devras placer ton fichier "credentials.json" (téléchargé depuis Google Cloud) à la racine
const KEYFILEPATH ="AIzaSyC3YqLO9sxpwfZtC2MNvXpdEoIG1YY_h3Q";

// Scopes : droits d'écriture
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Authentification
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Trouve ou Crée un dossier au nom du Patient
 */
const getOrCreatePatientFolder = async (patientName) => {
  try {
    // 1. Chercher si le dossier existe
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${patientName}' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
      return res.data.files[0].id; // Il existe, on retourne son ID
    }

    // 2. Sinon, on le crée
    const fileMetadata = {
      name: patientName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return folder.data.id;
  } catch (error) {
    console.error('Erreur Drive Folder:', error);
    throw error;
  }
};

/**
 * Upload le fichier dans le dossier du patient
 */
exports.uploadToDrive = async (fileObject, patientName, docType) => {
  try {
    const folderId = await getOrCreatePatientFolder(patientName);
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const { data } = await drive.files.create({
      media: {
        mimeType: fileObject.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: `${docType}_${Date.now()}.jpg`, // Ex: PMT_1680000.jpg
        parents: [folderId], // On le met dans le dossier du patient
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