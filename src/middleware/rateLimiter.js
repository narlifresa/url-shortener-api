const { safeIncr } = require('../redis');

/**
 * Factory: returns an Express rate-limiter middleware.
 *
 * @param {object} opts
 * @param {number} opts.windowSeconds  - rolling window in seconds
 * @param {number} opts.max            - max requests per window per IP
 * @param {string} [opts.keyPrefix]    - redis key prefix (e.g. 'rl:shorten')
 */
function rateLimiter({ windowSeconds = 60, max = 30, keyPrefix = 'rl:default' } = {}) {
  return async (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const key = `${keyPrefix}:${ip}`;
    const count = await safeIncr(key, windowSeconds);

    // If Redis is down (count === null) we let the request through
    if (count !== null && count > max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: windowSeconds,
      });
    }

    // Expose headers so clients know their quota
    if (count !== null) {
      res.set('X-RateLimit-Limit',     String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    }

    next();
  };
}

module.exports = { rateLimiter };
