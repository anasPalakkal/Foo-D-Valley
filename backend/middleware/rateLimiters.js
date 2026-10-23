const { Ratelimit } = require('@upstash/ratelimit');
const { redis } = require('../lib/redis');

// Strict — brute-force / enumeration / spam targets
// register, login, forgot-password, resend-verification
const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(7, '15 m'),
  prefix: 'ratelimit:strict',
  analytics: true,
});

// Moderate — refresh is called by every active tab roughly every 15 min,
// so the ceiling needs headroom for legitimate multi-tab usage.
const moderateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '15 m'),
  prefix: 'ratelimit:moderate',
  analytics: true,
});

// Write — expensive writes that carry a Cloudinary image upload
// (recipe create/update). Lower ceiling than moderate: no legitimate
// user posts more than a handful of recipes in 15 minutes, but a
// scraper/bot would if left unthrottled, and each request costs more
// than a plain JSON POST.
const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'ratelimit:write',
  analytics: true,
});

// Light — generous global backstop for everything else
const lightLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, '15 m'),
  prefix: 'ratelimit:light',
  analytics: true,
});

// Login, per-IP ceiling across all emails. Loose enough for shared NAT,
// tight enough to stop credential stuffing from one address.
const loginIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, '15 m'),
  prefix: 'ratelimit:login-ip',
  analytics: true,
});

const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'ratelimit:login',
  analytics: true,
});

const loginIpRateLimit = buildMiddleware(loginIpLimiter, (req) => `${req.ip}:login-ip`);

const loginRateLimit = buildMiddleware(
  loginLimiter,
  (req) => `${req.ip}:login:${String(req.body?.email || '').toLowerCase().trim().slice(0, 254)}`);

/**
 * Builds an Express middleware from an Upstash Ratelimit instance.
 * Keys by IP + route path, so register/login/forgot-password/etc each
 * get their own independent bucket instead of sharing one pooled counter.
 * Fails open on Redis errors — an outage should not take auth endpoints
 * down; it just temporarily loses rate-limit coverage.
 */

function buildMiddleware(limiter, keyFn = (req) => `${req.ip}:${req.path}`) {
  return async (req, res, next) => {
    try {
      const { success, limit, remaining, reset } = await limiter.limit(keyFn(req));

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((reset - Date.now()) / 1000)))
        return res.status(429).json({ error: 'Too many requests. Please try again later.' })
      }

      next();
    } catch (err) {
      console.error('Rate limiter error (failing open):', err);
      next();
    }
  };
}

const strictRateLimit = buildMiddleware(strictLimiter);
const moderateRateLimit = buildMiddleware(moderateLimiter);
const writeRateLimit = buildMiddleware(writeLimiter);
const lightRateLimit = buildMiddleware(lightLimiter);


module.exports = { strictRateLimit, moderateRateLimit, writeRateLimit, lightRateLimit, loginRateLimit, loginIpRateLimit };