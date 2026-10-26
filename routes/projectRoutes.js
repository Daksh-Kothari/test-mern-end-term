const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
