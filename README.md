# ai-notes-api

A RESTful API for creating and managing notes, with AI-powered summarization via OpenAI. Built with **Node.js**, **Express**, **PostgreSQL**, and the **OpenAI v4 SDK**.

---

## Features

- Full CRUD for notes (create, read, update, delete)
- AI summarization endpoint powered by `gpt-4o-mini`
- PostgreSQL persistence via the `pg` connection pool
- Clean error handling with meaningful HTTP status codes

---

## Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Runtime    | Node.js 18+              |
| Framework  | Express 4                |
| Database   | PostgreSQL 15+           |
| AI         | OpenAI API (v4 SDK)      |
| Config     | dotenv                   |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/narlifresa/ai-notes-api.git
cd ai-notes-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see the table below).

### 4. Create the database table

Connect to your PostgreSQL instance and run the schema:

```bash
psql -U postgres -d ai_notes -f src/db/schema.sql
```

Or paste the contents of [src/db/schema.sql](src/db/schema.sql) into your SQL client.

### 5. Start the server

```bash
# Production
npm start

# Development (auto-reload with nodemon)
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable        | Required | Description                                                        | Example                                              |
|-----------------|----------|--------------------------------------------------------------------|------------------------------------------------------|
| `PORT`          | No       | Port the Express server listens on (default: `3000`)               | `3000`                                               |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string                                        | `postgresql://postgres:pass@localhost:5432/ai_notes` |
| `OPENAI_API_KEY`| Yes      | Your OpenAI API key (required only for the `/summarize` endpoint)  | `sk-...`                                             |

---

## API Endpoints

### Base URL: `http://localhost:3000`

---

### `POST /notes` — Create a note

**Request body**

```json
{
  "title": "My first note",
  "content": "This is the body of my note."
}
```

**Response** `201 Created`

```json
{
  "id": 1,
  "title": "My first note",
  "content": "This is the body of my note.",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

---

### `GET /notes` — List all notes

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "title": "My first note",
    "content": "This is the body of my note.",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### `GET /notes/:id` — Get a single note

**Response** `200 OK`

```json
{
  "id": 1,
  "title": "My first note",
  "content": "This is the body of my note.",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Error** `404 Not Found`

```json
{ "error": "Note with id 99 not found" }
```

---

### `PUT /notes/:id` — Update a note

**Request body** (any combination of `title` / `content`)

```json
{
  "title": "Updated title",
  "content": "Updated content."
}
```

**Response** `200 OK`

```json
{
  "id": 1,
  "title": "Updated title",
  "content": "Updated content.",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Error** `404 Not Found`

```json
{ "error": "Note with id 99 not found" }
```

---

### `DELETE /notes/:id` — Delete a note

**Response** `200 OK`

```json
{
  "message": "Note 1 deleted successfully",
  "note": {
    "id": 1,
    "title": "My first note",
    "content": "This is the body of my note.",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error** `404 Not Found`

```json
{ "error": "Note with id 99 not found" }
```

---

### `POST /notes/:id/summarize` — Summarize a note with AI

Fetches the note, sends its content to OpenAI (`gpt-4o-mini`), and returns a concise summary.

**Response** `200 OK`

```json
{
  "summary": "A brief AI-generated summary of the note content."
}
```

**Error** `404 Not Found`

```json
{ "error": "Note with id 99 not found" }
```

**Error** `429 Too Many Requests`

```json
{ "error": "OpenAI rate limit exceeded, please retry later" }
```

---

## Project Structure

```
ai-notes-api/
├── src/
│   ├── controllers/
│   │   └── notesController.js   # Business logic for all endpoints
│   ├── routes/
│   │   └── notes.js             # Express router
│   └── db/
│       ├── index.js             # pg Pool wrapper
│       └── schema.sql           # Table definition
├── app.js                       # Express app entry point
├── .env.example                 # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## License

MIT
