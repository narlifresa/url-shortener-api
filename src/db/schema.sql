-- ── Notes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    TEXT         NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── URL Shortener ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS urls (
  id              SERIAL PRIMARY KEY,
  original_url    TEXT                     NOT NULL,
  short_code      VARCHAR(20) UNIQUE       NOT NULL,
  custom_slug     BOOLEAN                  DEFAULT FALSE,
  ai_generated    BOOLEAN                  DEFAULT FALSE,
  ai_description  TEXT,
  click_count     INTEGER                  DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at      TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS url_clicks (
  id          SERIAL PRIMARY KEY,
  url_id      INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  referer     TEXT
);

CREATE INDEX IF NOT EXISTS idx_urls_short_code         ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_url_clicks_url_id       ON url_clicks(url_id);
CREATE INDEX IF NOT EXISTS idx_url_clicks_clicked_at   ON url_clicks(clicked_at);
