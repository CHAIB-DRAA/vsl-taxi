const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. CONFIGURATION ROBUSTE (Port 465 + SSL)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // On force l'adresse exacte
    port: 465,              // On force le port SSL (plus fiable que 587)
    secure: true,           // true pour le port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // On ajoute des timeouts pour ne pas bloquer indéfiniment
    connectionTimeout: 10000, // 10 secondes max pour se connecter
    greetingTimeout: 5000,    // 5 secondes pour dire bonjour
    socketTimeout: 10000      // 10 secondes pour les échanges
  });

  console.log("🔌 Tentative de connexion SMTP (Port 465)...");

  // 2. VERIFICATION
  try {
    await transporter.verify();
    console.log("✅ Connexion SMTP réussie !");
  } catch (error) {
    console.error("❌ ECHEC Connexion SMTP :", error.message);
    // On lance une erreur pour que le Frontend arrête de tourner
    throw new Error("Impossible de contacter le serveur Gmail (Timeout ou Auth).");
  }

  // 3. MESSAGE
  const message = {
    from: `"Support Taxi App" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #FF6B00;">${options.subject}</h2>
        <p>${options.message}</p>
        ${options.token ? `<h1 style="background: #eee; padding: 10px; display: inline-block; border-radius: 5px;">${options.token}</h1>` : ''}
        <p>Ceci est un message automatique, merci de ne pas répondre.</p>
      </div>
    `
  };

  // 4. ENVOI
  console.log(`📤 Envoi en cours vers ${options.email}...`);
  await transporter.sendMail(message);
  console.log("✅ Email envoyé !");
};

module.exports = sendEmail;