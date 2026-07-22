const nodemailer = require("nodemailer");

const {
  BREVO_SMTP_HOST,
  BREVO_SMTP_PORT,
  BREVO_SMTP_USER,
  BREVO_SMTP_PASS,
  EMAIL_FROM, // e.g. "Foo D Valley <foodvalley.app@gmail.com>"
  CLIENT_URL,
} = process.env;

const transporter = nodemailer.createTransport({
  host: BREVO_SMTP_HOST,
  port: Number(BREVO_SMTP_PORT),
  secure: Number(BREVO_SMTP_PORT) === 465, // 465 = implicit TLS, 587 = STARTTLS
  auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_PASS },
});

// Fail fast at boot, not on the first user's registration attempt.
transporter
  .verify()
  .then(() => console.log("SMTP server ready"))
  .catch((err) => console.error("SMTP configuration error:", err.message));

async function sendEmail({ to, subject, text, html }) {
  if (!EMAIL_FROM) {
    console.error("Email not sent: EMAIL_FROM missing");
    return;
  }

  try {
    await transporter.sendMail({ from: EMAIL_FROM, to, subject, text, html });
  } catch (err) {
    console.error("Brevo SMTP send failed:", err.message);
  }
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${CLIENT_URL}/verify-email?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your Foo D Valley account",
    text: `Hi ${user.name}, confirm your email to unlock posting recipes and following other cooks: ${link} (expires in 24 hours)`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi ${user.name},</p>
        <p>Confirm your email to unlock posting recipes and following other cooks.</p>
        <p><a href="${link}">Verify your email</a></p>
        <p>This link expires in 24 hours. If you didn't create this account, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = `${CLIENT_URL}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Foo D Valley password",
    text: `Hi ${user.name}, reset your password here: ${link} (expires in 30 minutes). If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi ${user.name},</p>
        <p>Click below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${link}">Reset your password</a></p>
        <p>If you didn't request this, ignore this email — your password stays unchanged.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };