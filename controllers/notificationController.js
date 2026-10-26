const { NotificationRepository } = require('../models/Notification');
const { TopicRepository } = require('../models/Topic');
const { ExamRepository } = require('../models/Exam');
const { StudySessionRepository } = require('../models/StudySession');
const StreakEngine = require('../services/streakEngine');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const now = new Date();

    // Dynamically generate active reminders if needed
    const topics = await TopicRepository.findByUser(userId);
    const overdueTopics = topics.filter(t => t.nextRevisionDate && new Date(t.nextRevisionDate) < now);

    if (overdueTopics.length > 0) {
      const firstOverdue = overdueTopics[0];
      const existing = await NotificationRepository.findByUser(userId);
      const hasRecent = existing.some(n => n.type === 'REVISION_OVERDUE' && n.relatedEntityId === (firstOverdue._id || firstOverdue.id));
      
      if (!hasRecent) {
        await NotificationRepository.create({
          user: userId,
          type: 'REVISION_OVERDUE',
          title: 'Overdue Revisions Alert',
          message: `You have ${overdueTopics.length} topic${overdueTopics.length > 1 ? 's' : ''} overdue for revision including "${firstOverdue.title}".`,
          relatedEntityId: firstOverdue._id || firstOverdue.id,
          relatedEntityType: 'Topic'
        });
      }
    }

    const exams = await ExamRepository.findByUser(userId);
    const upcomingExams = exams.filter(e => {
      const days = Math.ceil((new Date(e.date) - now) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    });

    for (const exam of upcomingExams) {
      const days = Math.ceil((new Date(exam.date) - now) / (1000 * 60 * 60 * 24));
      const existing = await NotificationRepository.findByUser(userId);
      const hasExamNotif = existing.some(n => n.type === 'EXAM_APPROACHING' && n.relatedEntityId === (exam._id || exam.id));
      
      if (!hasExamNotif) {
        await NotificationRepository.create({
          user: userId,
          type: 'EXAM_APPROACHING',
          title: 'Exam Approaching!',
          message: `Your ${exam.name} exam is in ${days === 0 ? 'today!' : `${days} day${days > 1 ? 's' : ''}.`}`,
          relatedEntityId: exam._id || exam.id,
          relatedEntityType: 'Exam'
        });
      }
    }

    const notifications = await NotificationRepository.findByUser(userId, 50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user._id || req.user.id;
    const updated = await NotificationRepository.markAsRead(id, userId);
    res.json({ message: 'Notification marked as read', notification: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await NotificationRepository.markAllAsRead(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
