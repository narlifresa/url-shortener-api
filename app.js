require('dotenv').config();
const express = require('express');
const notesRouter = require('./src/routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/notes', notesRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ai-notes-api is running' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
