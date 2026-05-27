const { Router } = require('express');
const { redirectToUrl } = require('../controllers/urlController');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = Router();

const redirectLimiter = rateLimiter({ windowSeconds: 60, max: 100, keyPrefix: 'rl:redirect' });

// Only handle short codes — skip empty path and root
router.get('/:code', redirectLimiter, (req, res, next) => {
  const { code } = req.params;
  // Guard: must look like a short code (not a file/api path that slipped through)
  if (!code || code === 'favicon.ico') return next();
  return redirectToUrl(req, res, next);
});

module.exports = router;
