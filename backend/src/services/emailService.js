/* Email delivery for account verification.
 *
 * Like the AI scoring in llmService.js, this has a real path and a stubbed
 * fallback that's clearly labeled so nobody mistakes it for production
 * behaviour:
 *
 *  - If SMTP_HOST/SMTP_USER/SMTP_PASS are set in .env, mail is actually
 *    sent via nodemailer.
 *  - Otherwise, the "email" is written to the server console (prefixed
 *    "[email:mock]") and the verification link is also returned to the
 *    caller so the frontend can show it directly during local dev —
 *    no mailbox required to try the flow.
 */
let nodemailer = null;
try {
  // Optional dependency: only required if SMTP is actually configured.
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!nodemailer || !isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * @returns {{ delivered: boolean, previewUrl?: string }}
 */
async function sendVerificationEmail(user, rawToken) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5000';
  const verifyUrl = `${base}/?verifyEmail=${rawToken}`;
  const subject = 'Verify your LinGrow AI account';
  const text = `Hi ${user.name},\n\nWelcome to LinGrow AI! Confirm your email address to finish setting up your account:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`;

  const t = getTransporter();
  if (t) {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'LinGrow AI <no-reply@lingrow.ai>',
      to: user.email,
      subject,
      text,
    });
    return { delivered: true };
  }

  // Mock fallback — no SMTP configured.
  console.log('[email:mock] --------------------------------------------');
  console.log(`[email:mock] To: ${user.email}`);
  console.log(`[email:mock] Subject: ${subject}`);
  console.log(`[email:mock] Verify link: ${verifyUrl}`);
  console.log('[email:mock] (Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to send real emails.)');
  console.log('[email:mock] --------------------------------------------');
  return { delivered: false, previewUrl: verifyUrl };
}

module.exports = { sendVerificationEmail, isSmtpConfigured };
