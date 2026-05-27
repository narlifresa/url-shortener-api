const { Router } = require('express');
const {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  summarizeNote,
} = require('../controllers/notesController');

const router = Router();

// CRUD
router.post('/', createNote);
router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

// AI summarize
router.post('/:id/summarize', summarizeNote);

module.exports = router;
