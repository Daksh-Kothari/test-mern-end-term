const express = require('express');
const router = express.Router();
const { getProjectActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/project/:projectId', getProjectActivity);

module.exports = router;
