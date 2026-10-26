const express = require('express');
const router = express.Router();
const { createGoal, getGoals, updateGoal, deleteGoal } = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createGoal);
router.get('/', getGoals);
router.patch('/:id', updateGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
