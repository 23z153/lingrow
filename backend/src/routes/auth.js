const router = require('express').Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');
const {
  signAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} = require('../utils/tokens');

/** Issues a fresh access token + rotated refresh token for a user,
 * persists the new refresh token hash, and sets the refresh cookie. */
async function issueSession(user, res) {
  const accessToken = signAccessToken(user);
  const refresh = generateRefreshToken();
  user.refreshTokenHash = refresh.hash;
  user.refreshTokenExpires = refresh.expiresAt;
  await user.save();
  res.cookie(REFRESH_COOKIE_NAME, refresh.raw, refreshCookieOptions());
  return accessToken;
}

async function issueVerificationEmail(user) {
  const verification = generateEmailVerificationToken();
  user.emailVerificationTokenHash = verification.hash;
  user.emailVerificationExpires = verification.expiresAt;
  await user.save();
  return sendVerificationEmail(user, verification.raw);
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, batch } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    const user = new User({ name, email, role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student', department, batch });
    await user.setPassword(password);
    await user.save();

    const emailResult = await issueVerificationEmail(user);
    const accessToken = await issueSession(user, res);

    const body = { token: accessToken, user: user.toSafeJSON() };
    // In dev without SMTP configured, hand back the verify link directly so
    // the flow is testable without a real mailbox.
    if (!emailResult.delivered && emailResult.previewUrl) body.devVerifyUrl = emailResult.previewUrl;

    res.status(201).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.checkPassword(password || ''))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'Suspended') return res.status(403).json({ error: 'This account has been suspended' });

    // streak bookkeeping
    const today = new Date().toDateString();
    const last = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      user.streak = last === yesterday ? user.streak + 1 : 1;
      user.lastActiveDate = new Date();
      await user.save();
    }

    const accessToken = await issueSession(user, res);
    res.json({ token: accessToken, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Exchanges a valid refresh cookie for a new access token, rotating the
 * refresh token in the process. If the cookie is missing/expired/invalid,
 * the caller should treat this as "session over" and send the user to login. */
router.post('/refresh', async (req, res) => {
  try {
    const raw = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (!raw) return res.status(401).json({ error: 'No refresh token' });

    const hash = hashToken(raw);
    const user = await User.findOne({ refreshTokenHash: hash });
    if (!user || !user.refreshTokenExpires || user.refreshTokenExpires < new Date()) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'This account has been suspended' });
    }

    const accessToken = await issueSession(user, res); // rotates refresh token too
    res.json({ token: accessToken, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const raw = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (raw) {
      const hash = hashToken(raw);
      await User.updateOne({ refreshTokenHash: hash }, { $set: { refreshTokenHash: null, refreshTokenExpires: null } });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const hash = hashToken(token);
    const user = await User.findOne({ emailVerificationTokenHash: hash });
    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Verification link is invalid or has expired' });
    }
    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();
    res.json({ ok: true, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    if (req.user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
    const emailResult = await issueVerificationEmail(req.user);
    const body = { ok: true };
    if (!emailResult.delivered && emailResult.previewUrl) body.devVerifyUrl = emailResult.previewUrl;
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
