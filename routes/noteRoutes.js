const express = require('express');
const router = express.Router();
const { createNote, getNotes, updateNote, deleteNote } = require('../controllers/noteController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createNote);
router.get('/', getNotes);
router.patch('/:id', updateNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
