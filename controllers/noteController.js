const { NoteRepository } = require('../models/Note');

const createNote = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, content, subjectId, topicId, studySessionId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Note title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Note content cannot be empty.' });
    }

    const note = await NoteRepository.create({
      user: userId,
      subject: subjectId || null,
      topic: topicId || null,
      studySession: studySessionId || null,
      title: title.trim(),
      content: content.trim()
    });

    res.status(201).json({ message: 'Note saved successfully', note });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save note', error: error.message });
  }
};

const getNotes = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { topicId, subjectId } = req.query;

    const notes = await NoteRepository.findByUser(userId, { topicId, subjectId });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes', error: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user._id || req.user.id;
    const { title, content } = req.body;

    if (content !== undefined && !content.trim()) {
      return res.status(400).json({ message: 'Note content cannot be empty.' });
    }

    const updated = await NoteRepository.update(noteId, {
      title: title ? title.trim() : undefined,
      content: content ? content.trim() : undefined
    }, userId);

    if (!updated) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    res.json({ message: 'Note updated successfully', note: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note', error: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user._id || req.user.id;

    const success = await NoteRepository.delete(noteId, userId);
    if (!success) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note', error: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote
};
