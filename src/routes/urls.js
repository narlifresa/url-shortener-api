const { Router } = require('express');
const {
  createUrl,
  getAllUrls,
  getUrlByCode,
  updateUrl,
  deleteUrl,
  getUrlStats,
} = require('../controllers/urlController');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Stricter limit on URL creation (10/min), lighter on reads (60/min)
const createLimiter  = rateLimiter({ windowSeconds: 60, max: 10,  keyPrefix: 'rl:shorten' });
const defaultLimiter = rateLimiter({ windowSeconds: 60, max: 60,  keyPrefix: 'rl:urls'    });

router.post('/',             createLimiter,  createUrl);
router.get('/',              defaultLimiter, getAllUrls);
router.get('/:code',         defaultLimiter, getUrlByCode);
router.put('/:code',         defaultLimiter, updateUrl);
router.delete('/:code',      defaultLimiter, deleteUrl);
router.get('/:code/stats',   defaultLimiter, getUrlStats);

module.exports = router;
