const COOKIE_NAME = "refreshToken";
const COOKIE_PATH = "/api/auth"; // scoped to auth routes only, not sent on every request

const isProd = process.env.NODE_ENV === "production";

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProd,
    // Strict works locally since localhost:5173 -> localhost:5000 is same-site.
    // In production, frontend and backend live on different domains
    // (vercel.app vs onrender.com) - that's cross-site, and Strict would
    // silently block the browser from ever sending this cookie there.
    // None requires Secure:true, which is already guaranteed since both
    // flip together off the same isProd flag.
    sameSite: isProd ? "none" : "strict",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    path: COOKIE_PATH,
  });
}

module.exports = { setRefreshCookie, clearRefreshCookie, COOKIE_NAME };