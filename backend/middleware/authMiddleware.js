const { verifyAccessToken } = require("../lib/jwt");
const prisma = require("../lib/prismaClient");

/**
 * Full protection — blocks unauthenticated requests.
 * Verifies the access token signature/expiry only (no DB hit) — that's the
 * whole point of a stateless access token, keep it fast.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    // Payload uses `sub` (JWT standard claim name for subject). Normalize to
    // `id` here so every existing controller reading req.user.id keeps working
    // unchanged.
    req.user = { id: decoded.sub };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

/**
 * Optional — attaches user if a valid token exists, continues either way.
 * Used for public routes that behave differently for logged-in users.
 */
const optionalProtect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub };
  } catch {
    // Invalid or expired token — just continue without a user, don't block.
  }

  next();
};

/**
 * Gates spam-risk actions (posting a recipe, following) behind email
 * verification. Must run after `protect`, since it relies on req.user.id.
 *
 * This does one DB read - isVerified isn't in the access token payload, so
 * it can't be checked from the token alone. Only apply this to the specific
 * routes that need it, not globally, to avoid an extra query on every request.
 */
const requireVerified = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isVerified: true },
  });

  if (!user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: "Please verify your email to do this",
    });
  }

  next();
};

module.exports = { protect, optionalProtect, requireVerified };