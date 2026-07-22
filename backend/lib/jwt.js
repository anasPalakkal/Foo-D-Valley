const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
  JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES = "15m",
  REFRESH_TOKEN_EXPIRES_DAYS = "30",
} = process.env;

if (!JWT_ACCESS_SECRET) {
  // Fail fast at boot, not on the first request.
  throw new Error("JWT_ACCESS_SECRET is not set");
}

/**
 * Access token: short-lived, stateless, verified by signature only.
 * Never looked up in the DB — that's the point, it stays fast and stateless.
 */
function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES,
  });
}

function verifyAccessToken(token) {
  // Throws on invalid signature or expiry — let the caller handle the error.
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

/**
 * Refresh token: opaque random string, NOT a JWT.
 * It doesn't need to carry a payload — we look it up in the DB by its hash,
 * and the DB row carries the userId, expiry, and revocation state.
 * A plain random string keeps this simple and avoids a second JWT secret/format
 * to reason about.
 */
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + Number(REFRESH_TOKEN_EXPIRES_DAYS) * 24 * 60 * 60 * 1000
  );
  return { raw, tokenHash, expiresAt };
}

/**
 * SHA-256 hash for tokens stored in the DB (refresh, verification, password reset).
 * Deterministic and fast — this is not a password, it's a high-entropy random
 * token, so bcrypt's slow hashing is unnecessary and would just slow down lookups.
 */
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Generic helper for verification / password-reset tokens.
 * Same shape as generateRefreshToken but with a caller-supplied TTL,
 * since these need much shorter windows.
 */
function generateOpaqueToken(expiresInMinutes) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  return { raw, tokenHash, expiresAt };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateOpaqueToken,
  hashToken,
};