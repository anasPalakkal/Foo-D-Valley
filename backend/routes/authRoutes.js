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

// NOTE: rate limiters are not wired in yet — this is the next piece.
// authLimiter should apply to: register, login, forgot-password, resend-verification.
// refreshLimiter (looser) should apply to: refresh.

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", protect, getMe);

module.exports = router;