const { StudyGoalRepository } = require('../models/StudyGoal');
const { StudySessionRepository } = require('../models/StudySession');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { TopicRepository } = require('../models/Topic');
const { ActivityRepository } = require('../models/Activity');
const GoalEngine = require('../services/goalEngine');

const createGoal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, goalType, targetValue, endDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Goal title is required.' });
    }
    if (!goalType) {
      return res.status(400).json({ message: 'Goal type is required.' });
    }
    if (!targetValue || Number(targetValue) <= 0) {
      return res.status(400).json({ message: 'Target value must be a positive number.' });
    }

    const goal = await StudyGoalRepository.create({
      user: userId,
      title: title.trim(),
      goalType,
      targetValue: Number(targetValue),
      startDate: new Date(),
      endDate: endDate ? new Date(endDate) : null
    });

    await ActivityRepository.log({
      userId,
      action: 'GOAL_CREATED',
      details: { goalTitle: goal.title, targetValue: goal.targetValue }
    });

    res.status(201).json({ message: 'Study goal created successfully', goal });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create goal', error: error.message });
  }
};

const getGoals = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const goals = await StudyGoalRepository.findByUser(userId);

    const studySessions = await StudySessionRepository.findByUser(userId);
    const revisionRecords = await RevisionRecordRepository.findByUser(userId);
    const topics = await TopicRepository.findByUser(userId);

    const dataContext = { studySessions, revisionRecords, topics };

    const evaluatedGoals = await Promise.all(goals.map(async (goal) => {
      const gId = goal._id || goal.id;
      const evalResult = GoalEngine.evaluateGoal(goal, dataContext);

      // Auto update status if changed
      if (evalResult.status !== goal.status || evalResult.currentValue !== goal.currentValue) {
        await StudyGoalRepository.update(gId, {
          currentValue: evalResult.currentValue,
          status: evalResult.status
        });
      }

      const doc = goal.toObject ? goal.toObject() : goal;
      return {
        ...doc,
        _id: doc._id || doc.id,
        id: doc._id || doc.id,
        currentValue: evalResult.currentValue,
        progressPercentage: evalResult.progressPercentage,
        status: evalResult.status
      };
    }));

    res.json({ goals: evaluatedGoals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch goals', error: error.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    const userId = req.user._id || req.user.id;

    const goal = await StudyGoalRepository.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const gUserId = goal.user?._id || goal.user?.id || goal.user;
    if (String(gUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private goal' });
    }

    const { title, targetValue, endDate, status } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (targetValue !== undefined) updates.targetValue = Number(targetValue);
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updates.status = status;

    const updated = await StudyGoalRepository.update(goalId, updates);

    res.json({ message: 'Goal updated successfully', goal: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update goal', error: error.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    const userId = req.user._id || req.user.id;

    const goal = await StudyGoalRepository.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const gUserId = goal.user?._id || goal.user?.id || goal.user;
    if (String(gUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private goal' });
    }

    await StudyGoalRepository.delete(goalId);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete goal', error: error.message });
  }
};

module.exports = {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal
};
