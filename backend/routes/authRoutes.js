const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { strictRateLimit, moderateRateLimit, loginRateLimit, loginIpRateLimit } = require("../middleware/rateLimiters");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validators");

router.post("/register", strictRateLimit, validate(registerSchema), register);
router.post("/login", loginIpRateLimit, loginRateLimit, validate(loginSchema), login);
router.post("/refresh", moderateRateLimit, refresh);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);

router.get("/verify-email", verifyEmail);
// protect is already applied here (existing behavior) - resendVerification
// runs for the logged-in unverified user, so it doesn't take an email in
// the body. Not wiring resendVerificationSchema since there's nothing to
// validate; only rate-limited to stop spam-clicking resend.
router.post("/resend-verification", strictRateLimit, protect, resendVerification);

router.post("/forgot-password", strictRateLimit, validate(forgotPasswordSchema), forgotPassword);
// No rate limiter here on purpose: the reset token is single-use and
// expires in 30 min, so IP-based limiting adds friction without adding
// security. Say the word if you want it added anyway.
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.get("/me", protect, getMe);

module.exports = router;