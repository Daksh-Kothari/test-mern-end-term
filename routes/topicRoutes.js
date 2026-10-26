const express = require('express');
const router = express.Router();
const {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic
} = require('../controllers/topicController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createTopic);
router.get('/', getTopics);
router.get('/:id', getTopicById);
router.patch('/:id', updateTopic);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

module.exports = router;
