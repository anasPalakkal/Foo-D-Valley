const prisma = require("../lib/prismaClient");
const { generateRefreshToken, hashToken } = require("../lib/jwt");

/**
 * Issues a brand new refresh token row for a user.
 * Called on login, register, and as the final step of every successful rotation.
 */
async function issueRefreshToken(userId, { ip, userAgent } = {}) {
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      expiresAt,
      createdByIp: ip,
      userAgent,
      user: { connect: { id: userId } }, // Prisma 7 relation syntax
    },
  });

  return { raw, expiresAt };
}

/**
 * Core rotation logic. Call this from POST /auth/refresh.
 *
 * Given the raw refresh token from the cookie:
 *  - not found              -> invalid session, caller must force re-login
 *  - found but expired      -> invalid session, caller must force re-login
 *  - found but revoked      -> REUSE DETECTED. A token that was already rotated
 *                              out is being presented again, meaning it was
 *                              copied/stolen. Kill every session for this user.
 *  - found, valid           -> rotate: revoke this one, issue a new one, link them.
 *
 * Returns { userId, raw, expiresAt } on success.
 * Throws an Error with a `.code` property the route layer can branch on.
 */
async function rotateRefreshToken(rawToken, { ip, userAgent } = {}) {
  const tokenHash = hashToken(rawToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing) {
    const err = new Error("Refresh token not recognized");
    err.code = "REFRESH_INVALID";
    throw err;
  }

  if (existing.revokedAt) {
    // This token was already used once and rotated out. Seeing it again means
    // someone has a copy of a stale token - treat the whole session family as
    // compromised, not just this one token.
    await revokeAllUserTokens(existing.userId);
    const err = new Error("Refresh token reuse detected, all sessions revoked");
    err.code = "REFRESH_REUSE_DETECTED";
    throw err;
  }

  if (existing.expiresAt < new Date()) {
    const err = new Error("Refresh token expired");
    err.code = "REFRESH_EXPIRED";
    throw err;
  }

  // Valid - rotate. Issue the replacement first so we can link it, then revoke the old one.
  const { raw, tokenHash: newHash, expiresAt } = generateRefreshToken();

  const [newToken] = await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        expiresAt,
        createdByIp: ip,
        userAgent,
        user: { connect: { id: existing.userId } },
      },
    }),
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
  ]);

  // replacedBy is set in a second step since we need newToken's id, which
  // only exists after the transaction above completes.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { replacedBy: newToken.id },
  });

  return { userId: existing.userId, raw, expiresAt };
}

/** Revoke a single token - used on plain logout (this device only). */
async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active token for a user - used on logout-all and reuse detection. */
async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};