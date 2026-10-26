const { ProjectRepository } = require('../models/Project');
const { TaskRepository } = require('../models/Task');
const { ActivityRepository } = require('../models/Activity');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // 1. Fetch user's projects
    const userProjects = await ProjectRepository.findByUser(userId);
    const projectIds = userProjects.map(p => p._id || p.id);

    // 2. Fetch tasks across all projects user belongs to
    let allProjectTasks = [];
    const projectSummaries = [];

    const now = new Date();

    for (const project of userProjects) {
      const pId = project._id || project.id;
      const tasks = await TaskRepository.findByProject(pId);
      allProjectTasks = allProjectTasks.concat(tasks);

      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'DONE').length;
      const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const open = tasks.filter(t => t.status === 'BACKLOG' || t.status === 'TODO').length;
      const overdue = tasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      projectSummaries.push({
        project,
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        openTasks: open,
        overdueTasks: overdue,
        completionPercentage
      });
    }

    // 3. Filter user specific metrics
    const userAssignedTasks = allProjectTasks.filter(t => {
      const assigneeId = t.assignee?._id || t.assigneeId || t.assignee;
      return assigneeId && String(assigneeId) === String(userId);
    });

    const activeProjectsCount = userProjects.filter(p => p.status === 'ACTIVE').length;
    const completedTasksCount = userAssignedTasks.filter(t => t.status === 'DONE').length;
    const overdueTasksCount = userAssignedTasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length;

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonTasksCount = userAssignedTasks.filter(t => {
      if (t.status === 'DONE' || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= sevenDaysFromNow;
    }).length;

    // 4. Fetch recent activity across user projects
    const recentActivity = await ActivityRepository.findRecentForUserProjects(projectIds, 15);

    res.json({
      metrics: {
        activeProjectsCount,
        assignedTasksCount: userAssignedTasks.length,
        dueSoonTasksCount,
        completedTasksCount,
        overdueTasksCount
      },
      projectSummaries,
      recentActivity,
      assignedTasks: userAssignedTasks.slice(0, 10)
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to compute dashboard metrics', error: error.message });
  }
};

module.exports = {
  getDashboardStats
};
