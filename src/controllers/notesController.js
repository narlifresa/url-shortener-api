const db = require('../db');
const OpenAI = require('openai');

// Lazily initialise the OpenAI client so the module loads even if the key
// is not set (e.g. during unit tests that don't hit /summarize).
let openai;
const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

// POST /notes
const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const result = await db.query(
      'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createNote error:', err);
    return res.status(500).json({ error: 'Failed to create note' });
  }
};

// GET /notes
const getAllNotes = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notes ORDER BY created_at DESC'
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getAllNotes error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notes' });
  }
};

// GET /notes/:id
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM notes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Note with id ${id} not found` });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getNoteById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve note' });
  }
};

// PUT /notes/:id
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
      return res
        .status(400)
        .json({ error: 'At least one of title or content is required' });
    }

    // Fetch existing note first so we can keep fields that were not supplied
    const existing = await db.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `Note with id ${id} not found` });
    }

    const updatedTitle = title ?? existing.rows[0].title;
    const updatedContent = content ?? existing.rows[0].content;

    const result = await db.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [updatedTitle, updatedContent, id]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('updateNote error:', err);
    return res.status(500).json({ error: 'Failed to update note' });
  }
};

// DELETE /notes/:id
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Note with id ${id} not found` });
    }

    return res
      .status(200)
      .json({ message: `Note ${id} deleted successfully`, note: result.rows[0] });
  } catch (err) {
    console.error('deleteNote error:', err);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
};

// POST /notes/:id/summarize
const summarizeNote = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the note
    const result = await db.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Note with id ${id} not found` });
    }

    const note = result.rows[0];

    // 2. Ask OpenAI to summarize the content
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that summarizes notes concisely. ' +
            'Return only the summary, without any preamble.',
        },
        {
          role: 'user',
          content: `Summarize the following note titled "${note.title}":\n\n${note.content}`,
        },
      ],
      max_tokens: 256,
      temperature: 0.5,
    });

    const summary = completion.choices[0].message.content.trim();
    return res.status(200).json({ summary });
  } catch (err) {
    console.error('summarizeNote error:', err);

    // Surface OpenAI-specific errors more clearly
    if (err?.status === 401) {
      return res.status(500).json({ error: 'Invalid OpenAI API key' });
    }
    if (err?.status === 429) {
      return res.status(429).json({ error: 'OpenAI rate limit exceeded, please retry later' });
    }

    return res.status(500).json({ error: 'Failed to summarize note' });
  }
};

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  summarizeNote,
};
