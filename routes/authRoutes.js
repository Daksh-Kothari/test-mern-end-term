const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getAllUsers } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, getAllUsers);

module.exports = router;
