const express = require('express');
const router = express.Router();
const { getDashboardAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboardAnalytics);

module.exports = router;
