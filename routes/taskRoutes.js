const express = require('express');
const router = express.Router();
const {
  getTasksByProject,
  createTask,
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/project/:projectId', getTasksByProject);
router.post('/project/:projectId', createTask);
router.get('/:id', getTaskById);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
