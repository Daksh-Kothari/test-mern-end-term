const express = require('express');
const router = express.Router();
const { generateTasks, commitTasks } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/project/:projectId/generate', generateTasks);
router.post('/project/:projectId/commit', commitTasks);

module.exports = router;
