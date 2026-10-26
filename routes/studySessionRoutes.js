const express = require('express');
const router = express.Router();
const { createStudySession, getStudySessions } = require('../controllers/studySessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createStudySession);
router.get('/', getStudySessions);

module.exports = router;
