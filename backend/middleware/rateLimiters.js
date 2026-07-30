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
  limiter: Ratelimit.slidingWindow(30, '15 m'),
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

/**
 * Builds an Express middleware from an Upstash Ratelimit instance.
 * Keys by IP + route path, so register/login/forgot-password/etc each
 * get their own independent bucket instead of sharing one pooled counter.
 * Fails open on Redis errors — an outage should not take auth endpoints
 * down; it just temporarily loses rate-limit coverage.
 */
function buildMiddleware(limiter) {
  return async (req, res, next) => {
    const identifier = `${req.ip}:${req.path}`;

    try {
      const { success, limit, remaining, reset } = await limiter.limit(identifier);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
        });
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

module.exports = { strictRateLimit, moderateRateLimit, writeRateLimit, lightRateLimit };