const express = require('express');
const router = express.Router();
const { createExam, getExams, updateExam, deleteExam } = require('../controllers/examController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createExam);
router.get('/', getExams);
router.patch('/:id', updateExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

module.exports = router;
