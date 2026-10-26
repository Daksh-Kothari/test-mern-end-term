const { TaskRepository } = require('../models/Task');
const { ProjectMemberRepository } = require('../models/ProjectMember');
const { ActivityRepository } = require('../models/Activity');
const { UserRepository } = require('../models/User');

const getTasksByProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user._id || req.user.id;

    // Server-side project membership check
    const isMember = await ProjectMemberRepository.isMember(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this project.' });
    }

    const { search, status, priority, assignee, label } = req.query;
    const tasks = await TaskRepository.findByProject(projectId, {
      search,
      status,
      priority,
      assignee,
      label
    });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project tasks', error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user._id || req.user.id;

    const isMember = await ProjectMemberRepository.isMember(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to create tasks in this project.' });
    }

    const {
      title,
      description,
      status,
      priority,
      category,
      complexity,
      assigneeId,
      dueDate,
      labels,
      dependencies
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const task = await TaskRepository.create({
      project: projectId,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      category: category || 'General',
      complexity: complexity || '3',
      assignee: assigneeId || null,
      creator: userId,
      dueDate: dueDate || null,
      labels: Array.isArray(labels) ? labels : [],
      dependencies: Array.isArray(dependencies) ? dependencies : []
    });

    // Activity log
    await ActivityRepository.log({
      projectId,
      userId,
      action: 'TASK_CREATED',
      details: {
        taskId: task._id || task.id,
        taskTitle: task.title,
        status: task.status,
        priority: task.priority
      }
    });

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id || req.user.id;

    const task = await TaskRepository.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isMember = await ProjectMemberRepository.isMember(task.project, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this task\'s project.' });
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch task details', error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id || req.user.id;

    const existingTask = await TaskRepository.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectId = existingTask.project;
    const isMember = await ProjectMemberRepository.isMember(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You cannot update tasks in this project.' });
    }

    const {
      title,
      description,
      status,
      priority,
      category,
      complexity,
      assigneeId,
      dueDate,
      labels,
      dependencies
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (category !== undefined) updates.category = category;
    if (complexity !== undefined) updates.complexity = complexity;
    if (assigneeId !== undefined) updates.assignee = assigneeId || null;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (labels !== undefined) updates.labels = Array.isArray(labels) ? labels : [];
    if (dependencies !== undefined) updates.dependencies = Array.isArray(dependencies) ? dependencies : [];

    const updatedTask = await TaskRepository.update(taskId, updates);

    // Track status change activity specifically
    if (status !== undefined && status !== existingTask.status) {
      await ActivityRepository.log({
        projectId,
        userId,
        action: 'TASK_STATUS_CHANGED',
        details: {
          taskId,
          taskTitle: updatedTask.title,
          oldStatus: existingTask.status,
          newStatus: status
        }
      });
    }

    // Track priority change activity
    if (priority !== undefined && priority !== existingTask.priority) {
      await ActivityRepository.log({
        projectId,
        userId,
        action: 'TASK_PRIORITY_CHANGED',
        details: {
          taskId,
          taskTitle: updatedTask.title,
          oldPriority: existingTask.priority,
          newPriority: priority
        }
      });
    }

    // Track assignment change
    if (assigneeId !== undefined && String(assigneeId || '') !== String(existingTask.assignee?._id || existingTask.assignee || '')) {
      const assignedUser = assigneeId ? await UserRepository.findById(assigneeId) : null;
      await ActivityRepository.log({
        projectId,
        userId,
        action: 'TASK_ASSIGNED',
        details: {
          taskId,
          taskTitle: updatedTask.title,
          assigneeName: assignedUser ? assignedUser.name : 'Unassigned'
        }
      });
    }

    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id || req.user.id;

    const task = await TaskRepository.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectId = task.project;
    const memberRole = await ProjectMemberRepository.isMember(projectId, userId);

    const creatorId = task.creator?._id || task.creator?.id || task.creatorId || task.creator;
    const isCreator = String(creatorId) === String(userId);
    const isOwnerOrAdmin = memberRole === 'OWNER' || memberRole === 'ADMIN';

    if (!isCreator && !isOwnerOrAdmin) {
      return res.status(403).json({ message: 'Access denied: Only task creator or project owner/admin can delete tasks.' });
    }

    await TaskRepository.delete(taskId);

    await ActivityRepository.log({
      projectId,
      userId,
      action: 'TASK_DELETED',
      details: { taskTitle: task.title }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
};

module.exports = {
  getTasksByProject,
  createTask,
  getTaskById,
  updateTask,
  deleteTask
};
