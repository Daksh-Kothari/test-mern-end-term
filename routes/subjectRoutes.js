const express = require('express');
const router = express.Router();
const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createSubject);
router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.patch('/:id', updateSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
