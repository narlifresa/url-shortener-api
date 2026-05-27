require('dotenv').config();

const express = require('express');
const db = require('./src/db');

const notesRouter = require('./src/routes/notes');
const urlsRouter = require('./src/routes/urls');
const redirectRouter = require('./src/routes/redirect');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (lightweight)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/notes', notesRouter);
app.use('/api/urls', urlsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Redirect Route (must be LAST so it doesn't catch /api/*) ───────────────
app.use('/', redirectRouter);

// ── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
  const fs = require('fs');
  const path = require('path');

  try {
    // Strip UTF-8 BOM if present (PowerShell sometimes writes it)
    let schema = fs.readFileSync(
      path.join(__dirname, 'src', 'db', 'schema.sql'),
      'utf8'
    );
    if (schema.charCodeAt(0) === 0xFEFF) schema = schema.slice(1);
    await db.query(schema);
    console.log('[DB] Schema ready');
  } catch (err) {
    console.error('[DB] Failed to apply schema:', err.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

bootstrap();

module.exports = app;
