const axios = require("axios");

const {
  BREVO_API_KEY, // new env var — get this from Brevo dashboard > SMTP & API > API Keys
  EMAIL_FROM,
  CLIENT_URL,
} = process.env;

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Brevo expects sender as { name, email } rather than a combined string,
// so parse EMAIL_FROM once at load time. Keeping EMAIL_FROM's existing
// format ("Foo D Valley <foodvalley.app@gmail.com>") to avoid touching
// every other reference to this env var.
function parseSender(raw) {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (!match) return { name: undefined, email: raw.trim() };
  return { name: match[1].trim(), email: match[2].trim() };
}

async function sendEmail({ to, subject, text, html }) {
  if (!EMAIL_FROM) {
    console.error("Email not sent: EMAIL_FROM missing");
    return;
  }
  if (!BREVO_API_KEY) {
    console.error("Email not sent: BREVO_API_KEY missing");
    return;
  }

  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: parseSender(EMAIL_FROM),
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Brevo API send failed:", err.response?.data || err.message);
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