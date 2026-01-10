const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // CONFIGURATION "SERVICE" SIMPLIFIÉE
  // On ne spécifie pas de port, on laisse Nodemailer négocier avec Google
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // 👇 C'est cette partie qui peut sauver la mise sur Render
    tls: {
      rejectUnauthorized: false // On accepte les certificats même si Google fait la tête
    }
  });

  console.log("🔌 Tentative connexion via Service Gmail...");

  try {
    // On vérifie la connexion
    await transporter.verify();
    console.log("✅ Connexion SMTP réussie !");
  } catch (error) {
    console.error("❌ ECHEC SMTP (IP bloquée ?) :", error.message);
    // On lance l'erreur pour ne pas bloquer le frontend
    throw new Error("Erreur de connexion SMTP (Timeout ou Blocage IP).");
  }

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
      </div>
    `
  };

  console.log(`📤 Envoi vers ${options.email}...`);
  await transporter.sendMail(message);
  console.log("✅ Email envoyé !");
};

module.exports = sendEmail;