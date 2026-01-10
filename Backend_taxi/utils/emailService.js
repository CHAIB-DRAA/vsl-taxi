const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // CONFIGURATION SPÉCIALE CLOUD (Render/Heroku/etc)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // On passe au port 587 (STARTTLS) qui passe mieux les pare-feu
    secure: false,          // false pour le port 587 (c'est normal)
    requireTLS: true,       // On exige quand même la sécurité
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // 👇 LA CLÉ MAGIQUE POUR RENDER :
    family: 4,              // On force l'IPv4 (car l'IPv6 de Google bug souvent sur le cloud)
    // ----------------------------
    connectionTimeout: 10000, 
    greetingTimeout: 5000
  });

  console.log("🔌 Tentative connexion SMTP (Port 587 + IPv4)...");

  // Vérification
  try {
    await transporter.verify();
    console.log("✅ Connexion SMTP réussie !");
  } catch (error) {
    console.error("❌ ECHEC SMTP :", error.message);
    throw new Error("Impossible de contacter Gmail. Vérifiez les variables d'environnement.");
  }

  // Préparation du mail
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
        <p>Code valable 1 heure.</p>
      </div>
    `
  };

  // Envoi
  console.log(`📤 Envoi vers ${options.email}...`);
  await transporter.sendMail(message);
  console.log("✅ Email envoyé !");
};

module.exports = sendEmail;