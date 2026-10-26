const { TopicRepository } = require('../models/Topic');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { StudySessionRepository } = require('../models/StudySession');
const { SubjectRepository } = require('../models/Subject');
const { ActivityRepository } = require('../models/Activity');
const RevisionEngine = require('../services/revisionEngine');
const MasteryEngine = require('../services/masteryEngine');
const PriorityEngine = require('../services/priorityEngine');

const getRevisionQueue = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const allTopics = await TopicRepository.findByUser(userId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueToday = [];
    const overdue = [];
    const upcoming = [];
    const recommended = [];

    allTopics.forEach(rawTopic => {
      const topic = rawTopic.toObject ? rawTopic.toObject() : rawTopic;
      const nextDate = topic.nextRevisionDate ? new Date(topic.nextRevisionDate) : null;
      const mastery = topic.masteryScore || 0;
      const importance = (topic.importance || 'MEDIUM').toUpperCase();

      if (nextDate) {
        if (nextDate < startOfToday) {
          const daysOverdue = Math.floor((startOfToday - nextDate) / (1000 * 60 * 60 * 24)) + 1;
          overdue.push({ ...topic, daysOverdue });
          dueToday.push({ ...topic, daysOverdue });
        } else if (nextDate >= startOfToday && nextDate <= endOfToday) {
          dueToday.push({ ...topic, daysOverdue: 0 });
        } else if (nextDate > endOfToday && nextDate <= sevenDaysFromNow) {
          upcoming.push(topic);
        }
      }

      // Recommended: low mastery or high importance not due today
      if (mastery < 65 || importance === 'CRITICAL' || importance === 'HIGH') {
        if (!nextDate || nextDate > endOfToday) {
          recommended.push(topic);
        }
      }
    });

    res.json({
      dueToday: dueToday.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)),
      overdue: overdue.sort((a, b) => b.daysOverdue - a.daysOverdue),
      upcoming: upcoming.sort((a, b) => new Date(a.nextRevisionDate) - new Date(b.nextRevisionDate)),
      recommended: recommended.sort((a, b) => (a.masteryScore || 0) - (b.masteryScore || 0)).slice(0, 10)
    });
  } catch (error) {
    console.error('Get Revision Queue Error:', error);
    res.status(500).json({ message: 'Failed to generate revision queue', error: error.message });
  }
};

const completeRevision = async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const userId = req.user._id || req.user.id;
    const { recallRating, durationMinutes, notes } = req.body;

    if (!recallRating) {
      return res.status(400).json({ message: 'Recall rating (FORGOT, HARD, GOOD, EASY) is required.' });
    }

    const topic = await TopicRepository.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const tUserId = topic.user?._id || topic.user?.id || topic.user;
    if (String(tUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Topic belongs to another user.' });
    }

    const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 15;
    const sId = topic.subject?._id || topic.subject?.id || topic.subject;
    const subject = await SubjectRepository.findById(sId);

    // 1. Create StudySession
    const session = await StudySessionRepository.create({
      user: userId,
      subject: sId,
      topic: topicId,
      startTime: new Date(Date.now() - duration * 60 * 1000),
      endTime: new Date(),
      durationMinutes: duration,
      sessionType: 'REVISION',
      notes: notes ? notes.trim() : '',
      recallRating
    });

    // 2. Fetch past revision records
    const pastRevisions = await RevisionRecordRepository.findByTopic(topicId);

    // 3. Compute next revision interval via RevisionEngine
    const revisionResult = RevisionEngine.calculateNextRevision({
      recallRating,
      previousInterval: topic.intervalDays || 1,
      easeFactor: topic.easeFactor || 2.5,
      consecutiveSuccesses: topic.consecutiveSuccesses || 0,
      difficulty: topic.difficulty,
      importance: topic.importance,
      examDaysLeft: subject?.examDate ? Math.floor((new Date(subject.examDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
    });

    // 4. Compute updated mastery score
    const allSessions = await StudySessionRepository.findByTopic(topicId);
    const masteryResult = MasteryEngine.calculateMastery({
      revisionRecords: [...pastRevisions, { recallRating }],
      consecutiveSuccesses: revisionResult.consecutiveSuccesses,
      nextRevisionDate: revisionResult.nextRevisionDate,
      difficulty: topic.difficulty,
      totalSessions: allSessions.length
    });

    // 5. Compute priority
    const priorityResult = PriorityEngine.calculatePriority({
      nextRevisionDate: revisionResult.nextRevisionDate,
      masteryScore: masteryResult.masteryScore,
      importance: topic.importance,
      difficulty: topic.difficulty,
      examDate: subject?.examDate
    });

    const oldMastery = topic.masteryScore || 0;
    const oldInterval = topic.intervalDays || 1;

    // 6. Update Topic
    const updatedTopic = await TopicRepository.update(topicId, {
      lastStudiedAt: new Date(),
      nextRevisionDate: revisionResult.nextRevisionDate,
      consecutiveSuccesses: revisionResult.consecutiveSuccesses,
      easeFactor: revisionResult.easeFactor,
      intervalDays: revisionResult.intervalDays,
      masteryScore: masteryResult.masteryScore,
      completionStatus: masteryResult.completionStatus,
      priorityScore: priorityResult.priorityScore,
      priorityLevel: priorityResult.priorityLevel
    });

    // 7. Log RevisionRecord
    await RevisionRecordRepository.create({
      user: userId,
      subject: sId,
      topic: topicId,
      studySession: session._id || session.id,
      recallRating,
      oldMastery,
      newMastery: masteryResult.masteryScore,
      oldInterval,
      newInterval: revisionResult.intervalDays,
      nextRevisionDate: revisionResult.nextRevisionDate
    });

    // 8. Log Activity
    await ActivityRepository.log({
      userId,
      action: 'REVISION_COMPLETED',
      details: {
        topicTitle: topic.title,
        recallRating,
        oldMastery,
        newMastery: masteryResult.masteryScore,
        nextRevisionDate: revisionResult.nextRevisionDate
      }
    });

    res.json({
      message: `Revision recorded! Next review scheduled for ${new Date(revisionResult.nextRevisionDate).toLocaleDateString()}`,
      session,
      topic: updatedTopic,
      revisionResult,
      masteryResult
    });
  } catch (error) {
    console.error('Complete Revision Error:', error);
    res.status(500).json({ message: 'Failed to record revision completion', error: error.message });
  }
};

module.exports = {
  getRevisionQueue,
  completeRevision
};
