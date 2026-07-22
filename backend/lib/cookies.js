const COOKIE_NAME = "refreshToken";
const COOKIE_PATH = "/api/auth"; // scoped to auth routes only, not sent on every request

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
  });
}

module.exports = { setRefreshCookie, clearRefreshCookie, COOKIE_NAME };