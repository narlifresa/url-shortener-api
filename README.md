# url-shortener-api

A production-ready **URL Shortener REST API** built with **Node.js**, **Express**, **PostgreSQL**, **Redis**, and **OpenAI**. Features include AI-powered slug generation, Redis caching for ultra-fast redirects, click tracking, rate limiting, and full CRUD management.

---

## Features

| Feature | Details |
|---|---|
| **Short URL creation** | Random or custom slugs, optional expiry |
| **AI slug generation** | OpenAI `gpt-4o-mini` suggests a meaningful slug + description |
| **Fast redirects** | Redis cache for sub-millisecond lookups |
| **Click analytics** | Per-URL click count, daily breakdown, recent clicks |
| **Rate limiting** | Redis-backed sliding window per IP |
| **Notes API** | Original notes CRUD + AI summarization (kept intact) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | PostgreSQL 15+ |
| Cache / Rate limiting | Redis 7+ (ioredis) |
| AI | OpenAI API (gpt-4o-mini) |
| Config | dotenv |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/narlifresa/url-shortener-api.git
cd url-shortener-api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL, REDIS_URL, OPENAI_API_KEY

# 4. Start PostgreSQL and Redis, then run the server
npm start
```

The server auto-applies the database schema on startup.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `BASE_URL` | No | `http://localhost:3000` | Used in short URL responses |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `OPENAI_API_KEY` | No* | — | Required only for `ai_slug: true` |

---

## URL Shortener API

### Base: `http://localhost:3000`

---

### `POST /api/urls` — Create a short URL

**Body**

```json
{
  "url": "https://example.com/some/long/path",
  "custom_slug": "my-link",
  "ai_slug": true,
  "expires_in_days": 30
}
```

- `url` — **required**. Must start with `http://` or `https://`
- `custom_slug` — optional custom code (3-30 chars, letters/digits/hyphen/underscore)
- `ai_slug` — if `true`, OpenAI generates the slug (overridden by `custom_slug`)
- `expires_in_days` — optional; omit for no expiry

**Response** `201 Created`

```json
{
  "id": 1,
  "original_url": "https://example.com/some/long/path",
  "short_code": "gh-docs",
  "short_url": "http://localhost:3000/gh-docs",
  "custom_slug": false,
  "ai_generated": true,
  "ai_description": "Official GitHub documentation page.",
  "click_count": 0,
  "created_at": "2026-05-27T10:00:00.000Z",
  "updated_at": "2026-05-27T10:00:00.000Z",
  "expires_at": null
}
```

---

### `GET /api/urls` — List all short URLs

Query params: `?page=1&limit=20`

---

### `GET /api/urls/:code` — Get URL details

---

### `PUT /api/urls/:code` — Update a URL

```json
{ "url": "https://new-target.com", "expires_in_days": 7 }
```

---

### `DELETE /api/urls/:code` — Delete a short URL

---

### `GET /api/urls/:code/stats` — Click analytics

Returns daily click breakdown (last 30 days) and 10 most recent clicks.

---

### `GET /:code` — Redirect

Issues a `302` redirect to the original URL and tracks the click.

Returns `410 Gone` if the URL has expired, `404` if not found.

---

## Notes API (kept from original project)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notes` | Create note |
| `GET` | `/api/notes` | List notes |
| `GET` | `/api/notes/:id` | Get note |
| `PUT` | `/api/notes/:id` | Update note |
| `DELETE` | `/api/notes/:id` | Delete note |
| `POST` | `/api/notes/:id/summarize` | AI summarize |

---

## Project Structure

```
url-shortener-api/
├── app.js                            # Entry point — Express setup + bootstrap
├── src/
│   ├── controllers/
│   │   ├── notesController.js        # Notes CRUD + AI summarize
│   │   └── urlController.js          # URL CRUD + redirect + stats
│   ├── routes/
│   │   ├── notes.js                  # /api/notes routes
│   │   ├── urls.js                   # /api/urls routes
│   │   └── redirect.js               # /:code redirect route
│   ├── db/
│   │   ├── index.js                  # pg Pool
│   │   └── schema.sql                # notes + urls + url_clicks tables
│   ├── redis/
│   │   └── index.js                  # ioredis client + safe wrappers
│   ├── services/
│   │   └── aiService.js              # OpenAI slug + description generator
│   ├── middleware/
│   │   └── rateLimiter.js            # Redis sliding-window rate limiter
│   └── utils/
│       └── shortCode.js              # Base62 random code generator
├── .env.example
├── .gitignore
└── package.json
```

---

## License

MIT
