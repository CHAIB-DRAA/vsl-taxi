const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Configuration pour Gmail (ou autre SMTP)
  // ⚠️ Pour Gmail : il faut créer un "Mot de passe d'application" dans ton compte Google
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Ton adresse gmail (ex: 'taxi.app@gmail.com')
      pass: process.env.EMAIL_PASS  // Ton mot de passe d'application (pas le vrai mdp)
    }
  });

  const message = {
    from: `"Support Taxi App" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #FF6B00;">Réinitialisation Mot de Passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Voici votre code de sécurité :</p>
        <h1 style="background: #eee; padding: 10px; display: inline-block; border-radius: 5px;">${options.token}</h1>
        <p>Ce code expire dans 1 heure.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;