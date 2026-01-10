const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Création du transporteur
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // 2. DEBUG : Vérifier la connexion SMTP avant d'envoyer
  console.log("🔌 Test de connexion SMTP...");
  try {
    await transporter.verify();
    console.log("✅ Connexion SMTP réussie ! Prêt à envoyer.");
  } catch (error) {
    console.error("❌ Erreur de connexion SMTP (Identifiants invalides ?):", error);
    throw new Error("Impossible de se connecter au service Email.");
  }

  // 3. Configuration de l'email
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
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `
  };

  // 4. Envoi
  console.log(`📤 Envoi de l'email à ${options.email}...`);
  const info = await transporter.sendMail(message);
  console.log("✅ Email envoyé avec succès. ID:", info.messageId);
};

module.exports = sendEmail;