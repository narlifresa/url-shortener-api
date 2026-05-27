const db = require('../db');
const { safeGet, safeSet, safeDel } = require('../redis');
const { generateShortCode, isValidSlug } = require('../utils/shortCode');
const { generateSlugAndDescription } = require('../services/aiService');

const BASE_URL = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const CACHE_TTL = 3600; // 1 hour

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildShortUrl(code) {
  return `${BASE_URL()}/${code}`;
}

function formatUrl(row) {
  return {
    id:              row.id,
    original_url:    row.original_url,
    short_code:      row.short_code,
    short_url:       buildShortUrl(row.short_code),
    custom_slug:     row.custom_slug,
    ai_generated:    row.ai_generated,
    ai_description:  row.ai_description,
    click_count:     row.click_count,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
    expires_at:      row.expires_at,
  };
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Generate a unique short code (retry on collision)
async function uniqueShortCode(preferredCode) {
  if (preferredCode) {
    const existing = await db.query(
      'SELECT id FROM urls WHERE short_code = $1',
      [preferredCode]
    );
    if (existing.rows.length > 0) return null; // collision
    return preferredCode;
  }
  for (let i = 0; i < 5; i++) {
    const code = generateShortCode();
    const check = await db.query(
      'SELECT id FROM urls WHERE short_code = $1',
      [code]
    );
    if (check.rows.length === 0) return code;
  }
  return null;
}

// ── POST /api/urls ───────────────────────────────────────────────────────────
const createUrl = async (req, res) => {
  try {
    const { url, custom_slug, ai_slug, expires_in_days } = req.body;

    if (!url) return res.status(400).json({ error: '"url" is required' });
    if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });

    let shortCode;
    let aiGenerated = false;
    let aiDescription = null;
    let isCustom = false;

    if (custom_slug) {
      // User supplied a custom slug
      if (!isValidSlug(custom_slug)) {
        return res.status(400).json({
          error: 'custom_slug must be 3-30 characters: letters, digits, hyphens, underscores only',
        });
      }
      shortCode = await uniqueShortCode(custom_slug);
      if (!shortCode) {
        return res.status(409).json({ error: `Slug "${custom_slug}" is already taken` });
      }
      isCustom = true;

    } else if (ai_slug) {
      // AI-generated slug
      const ai = await generateSlugAndDescription(url);
      aiDescription = ai.description;

      if (ai.slug && isValidSlug(ai.slug)) {
        shortCode = await uniqueShortCode(ai.slug);
      }
      // Fall back to random if AI slug collides or is empty
      if (!shortCode) {
        shortCode = await uniqueShortCode(null);
      }
      aiGenerated = true;

    } else {
      // Random short code
      shortCode = await uniqueShortCode(null);
    }

    if (!shortCode) {
      return res.status(500).json({ error: 'Could not generate a unique short code. Try again.' });
    }

    // Compute optional expiry
    let expiresAt = null;
    if (expires_in_days) {
      const days = parseInt(expires_in_days, 10);
      if (!Number.isNaN(days) && days > 0) {
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const result = await db.query(
      `INSERT INTO urls
         (original_url, short_code, custom_slug, ai_generated, ai_description, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [url, shortCode, isCustom, aiGenerated, aiDescription, expiresAt]
    );

    const row = result.rows[0];

    // Pre-warm Redis cache
    await safeSet(`url:${shortCode}`, url, CACHE_TTL);

    return res.status(201).json(formatUrl(row));
  } catch (err) {
    console.error('createUrl error:', err);
    return res.status(500).json({ error: 'Failed to create short URL' });
  }
};

// ── GET /api/urls ────────────────────────────────────────────────────────────
const getAllUrls = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      db.query('SELECT COUNT(*) FROM urls'),
      db.query(
        'SELECT * FROM urls ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
    ]);

    return res.json({
      total:    parseInt(countResult.rows[0].count, 10),
      page,
      limit,
      urls: dataResult.rows.map(formatUrl),
    });
  } catch (err) {
    console.error('getAllUrls error:', err);
    return res.status(500).json({ error: 'Failed to retrieve URLs' });
  }
};

// ── GET /api/urls/:code ──────────────────────────────────────────────────────
const getUrlByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.query('SELECT * FROM urls WHERE short_code = $1', [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Short URL "${code}" not found` });
    }

    return res.json(formatUrl(result.rows[0]));
  } catch (err) {
    console.error('getUrlByCode error:', err);
    return res.status(500).json({ error: 'Failed to retrieve URL' });
  }
};

// ── PUT /api/urls/:code ──────────────────────────────────────────────────────
const updateUrl = async (req, res) => {
  try {
    const { code } = req.params;
    const { url, expires_in_days } = req.body;

    const existing = await db.query(
      'SELECT * FROM urls WHERE short_code = $1',
      [code]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `Short URL "${code}" not found` });
    }

    const row = existing.rows[0];

    const newUrl = url && isValidUrl(url) ? url : row.original_url;

    let expiresAt = row.expires_at;
    if (expires_in_days !== undefined) {
      if (expires_in_days === null || expires_in_days === 0) {
        expiresAt = null;
      } else {
        const days = parseInt(expires_in_days, 10);
        if (!Number.isNaN(days) && days > 0) {
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
      }
    }

    const result = await db.query(
      `UPDATE urls
       SET original_url = $1, expires_at = $2, updated_at = NOW()
       WHERE short_code = $3
       RETURNING *`,
      [newUrl, expiresAt, code]
    );

    // Invalidate cache
    await safeDel(`url:${code}`);
    await safeSet(`url:${code}`, newUrl, CACHE_TTL);

    return res.json(formatUrl(result.rows[0]));
  } catch (err) {
    console.error('updateUrl error:', err);
    return res.status(500).json({ error: 'Failed to update URL' });
  }
};

// ── DELETE /api/urls/:code ───────────────────────────────────────────────────
const deleteUrl = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.query(
      'DELETE FROM urls WHERE short_code = $1 RETURNING *',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Short URL "${code}" not found` });
    }

    await safeDel(`url:${code}`);

    return res.json({
      message: `Short URL "${code}" deleted successfully`,
      url: formatUrl(result.rows[0]),
    });
  } catch (err) {
    console.error('deleteUrl error:', err);
    return res.status(500).json({ error: 'Failed to delete URL' });
  }
};

// ── GET /api/urls/:code/stats ────────────────────────────────────────────────
const getUrlStats = async (req, res) => {
  try {
    const { code } = req.params;

    const urlResult = await db.query(
      'SELECT * FROM urls WHERE short_code = $1',
      [code]
    );
    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: `Short URL "${code}" not found` });
    }

    const url = urlResult.rows[0];

    // Clicks grouped by day (last 30 days)
    const clicksByDay = await db.query(
      `SELECT DATE(clicked_at) AS date, COUNT(*) AS clicks
       FROM url_clicks
       WHERE url_id = $1
         AND clicked_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(clicked_at)
       ORDER BY date DESC`,
      [url.id]
    );

    // 10 most recent clicks
    const recentClicks = await db.query(
      `SELECT clicked_at, ip_address, user_agent, referer
       FROM url_clicks
       WHERE url_id = $1
       ORDER BY clicked_at DESC
       LIMIT 10`,
      [url.id]
    );

    return res.json({
      ...formatUrl(url),
      clicks_by_day:  clicksByDay.rows,
      recent_clicks:  recentClicks.rows,
    });
  } catch (err) {
    console.error('getUrlStats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve URL stats' });
  }
};

// ── GET /:code  (redirect) ───────────────────────────────────────────────────
const redirectToUrl = async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Try Redis cache first
    let originalUrl = await safeGet(`url:${code}`);

    if (!originalUrl) {
      // 2. Fall back to PostgreSQL
      const result = await db.query(
        'SELECT id, original_url, expires_at FROM urls WHERE short_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Short URL "${code}" not found` });
      }

      const row = result.rows[0];

      // 3. Check expiry
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ error: 'This short URL has expired' });
      }

      originalUrl = row.original_url;

      // 4. Cache for next time
      const ttl = row.expires_at
        ? Math.max(1, Math.floor((new Date(row.expires_at) - Date.now()) / 1000))
        : CACHE_TTL;
      await safeSet(`url:${code}`, originalUrl, ttl);
    }

    // 5. Track click asynchronously (fire-and-forget)
    setImmediate(() => {
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        null;
      const ua      = req.headers['user-agent']  || null;
      const referer = req.headers['referer']      || null;

      db.query(
        `UPDATE urls SET click_count = click_count + 1, updated_at = NOW()
         WHERE short_code = $1`,
        [code]
      ).catch(console.error);

      db.query(
        `INSERT INTO url_clicks (url_id, ip_address, user_agent, referer)
         SELECT id, $2, $3, $4 FROM urls WHERE short_code = $1`,
        [code, ip, ua, referer]
      ).catch(console.error);
    });

    // 6. Redirect
    return res.redirect(302, originalUrl);
  } catch (err) {
    console.error('redirectToUrl error:', err);
    return res.status(500).json({ error: 'Redirect failed' });
  }
};

module.exports = {
  createUrl,
  getAllUrls,
  getUrlByCode,
  updateUrl,
  deleteUrl,
  getUrlStats,
  redirectToUrl,
};
