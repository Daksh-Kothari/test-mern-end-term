const express = require('express');
const router = express.Router();
const {
  getCommentsByTask,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/task/:taskId', getCommentsByTask);
router.post('/task/:taskId', createComment);
router.patch('/:id', updateComment);
router.delete('/:id', deleteComment);

module.exports = router;
