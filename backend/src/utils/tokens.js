const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '30', 10);

/** Short-lived JWT used to authenticate API requests. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, jti: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    }
  );
}

/** Opaque, high-entropy refresh token. We store only a hash of it (like a password),
 * so a leaked database dump doesn't hand out usable refresh tokens. */
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  return { raw, hash: hashToken(raw), expiresAt };
}

function generateEmailVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return { raw, hash: hashToken(raw), expiresAt };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const REFRESH_COOKIE_NAME = 'lingrow_refresh';
const REFRESH_COOKIE_MAX_AGE_MS = REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',
  };
}

module.exports = {
  signAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
};
