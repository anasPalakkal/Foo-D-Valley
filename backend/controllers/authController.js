const bcrypt = require("bcryptjs");
const prisma = require("../lib/prismaClient");
const { signAccessToken, generateOpaqueToken, hashToken } = require("../lib/jwt");
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require("../services/authToken.service");
const { setRefreshCookie, clearRefreshCookie, COOKIE_NAME } = require("../lib/cookies");
const { isDemoUser, demoForbidden } = require("../lib/demo");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/email.service");

// Fields returned in every auth/profile response — keep in sync across authController and profileController
const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  isVerified: true,
  _count: {
    select: {
      followers: true,
      following: true,
      recipes: true,
    },
  },
};

async function issueSession(res, userId, req) {
  const accessToken = signAccessToken(userId);
  const { raw, expiresAt } = await issueRefreshToken(userId, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  setRefreshCookie(res, raw, expiresAt);
  return accessToken;
}

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, lastLoginAt: new Date() },
      select: userSelect,
    });

    const accessToken = await issueSession(res, user.id, req);

    // Fire-and-forget: don't block the response on email delivery.
    const { raw, tokenHash, expiresAt } = generateOpaqueToken(24 * 60);
    await prisma.verificationToken.create({
      data: { tokenHash, expiresAt, user: { connect: { id: user.id } } },
    });
    sendVerificationEmail(user, raw).catch((err) =>
      console.error("sendVerificationEmail failed:", err)
    );

    res.status(201).json({ accessToken, user });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, password: true, isDeleted: true, scheduledDeletionAt: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reactivate if account was pending deletion — row still exists means
    // the purge job hasn't run yet, so recovery is still valid
    if (user.isDeleted) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isDeleted: false, scheduledDeletionAt: null },
      });
      user.isDeleted = false;
      user.scheduledDeletionAt = null;
    }

    const accessToken = await issueSession(res, user.id, req);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { password: _pw, isDeleted, scheduledDeletionAt, ...safeUser } = user;

    res.json({ accessToken, user: safeUser });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/auth/refresh
 * No body needed — the refresh token comes from the httpOnly cookie.
 * Every outcome that fails clears the cookie and returns a generic 401,
 * regardless of which internal reason caused it (see authToken.service.js).
 */
const refresh = async (req, res) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken) return res.status(401).json({ message: "Not authorized" });

  try {
    const { userId, raw, expiresAt } = await rotateRefreshToken(rawToken, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    setRefreshCookie(res, raw, expiresAt);
    const accessToken = signAccessToken(userId);

    // Cheap staleness check avoids a write on every 15-min refresh cycle —
    // only updates once per ~12h of continuous activity.
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    prisma.user
      .updateMany({
        where: { id: userId, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: twelveHoursAgo } }] },
        data: { lastLoginAt: new Date() },
      })
      .catch((err) => console.error("lastLoginAt update failed:", err.message));

    res.json({ accessToken });
  } catch (error) {
    clearRefreshCookie(res);
    console.error("Refresh failed:", error.code || error.message);
    return res.status(401).json({ message: "Not authorized" });
  }
};

/** POST /api/auth/logout — revokes this device's session only. */
const logout = async (req, res) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }
  clearRefreshCookie(res);
  res.json({ message: "Logged out" });
};

/** POST /api/auth/logout-all — revokes every session for the current user. */
const logoutAll = async (req, res) => {
  if (isDemoUser(req.user.id)) return demoForbidden(res);
  await revokeAllUserTokens(req.user.id);
  clearRefreshCookie(res);
  res.json({ message: "Logged out of all devices" });
};

/** GET /api/auth/verify-email?token=... */
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Missing token" });
  }

  const tokenHash = hashToken(token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired verification link" });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: "Email verified" });
};

/** POST /api/auth/resend-verification — requires auth, rate-limited at the route level. */
const resendVerification = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.isVerified) {
    return res.status(400).json({ message: "Email already verified" });
  }

  const { raw, tokenHash, expiresAt } = generateOpaqueToken(24 * 60);
  await prisma.verificationToken.create({
    data: { tokenHash, expiresAt, user: { connect: { id: user.id } } },
  });
  sendVerificationEmail(user, raw).catch((err) =>
    console.error("sendVerificationEmail failed:", err)
  );

  res.json({ message: "Verification email sent" });
};

/**
 * POST /api/auth/forgot-password
 * Always returns the same generic response whether or not the email exists —
 * otherwise this endpoint becomes a way to enumerate registered emails.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !isDemoUser(user.id)) {
    const { raw, tokenHash, expiresAt } = generateOpaqueToken(30);
    await prisma.passwordResetToken.create({
      data: { tokenHash, expiresAt, user: { connect: { id: user.id } } },
    });
    sendPasswordResetEmail(user, raw).catch((err) =>
      console.error("sendPasswordResetEmail failed:", err)
    );
  }

  res.json({ message: "If that email exists, a reset link has been sent" });
};

/** POST /api/auth/reset-password  body: { token, newPassword } */
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    if (isDemoUser(record.userId)) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await revokeAllUserTokens(record.userId);
  clearRefreshCookie(res);

  res.json({ message: "Password reset successful, please log in" });
};

module.exports = {
  register,
  login,
  getMe,
  refresh,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  userSelect,
};