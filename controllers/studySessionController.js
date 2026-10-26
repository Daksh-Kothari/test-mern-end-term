const { StudySessionRepository } = require('../models/StudySession');
const { TopicRepository } = require('../models/Topic');
const { SubjectRepository } = require('../models/Subject');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { ActivityRepository } = require('../models/Activity');
const RevisionEngine = require('../services/revisionEngine');
const MasteryEngine = require('../services/masteryEngine');
const PriorityEngine = require('../services/priorityEngine');

const createStudySession = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      subjectId,
      topicId,
      startTime,
      endTime,
      durationMinutes,
      sessionType,
      notes,
      recallRating
    } = req.body;

    if (!topicId) {
      return res.status(400).json({ message: 'Topic is required for recording a study session.' });
    }

    const topic = await TopicRepository.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const tUserId = topic.user?._id || topic.user?.id || topic.user;
    if (String(tUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Topic belongs to another user.' });
    }

    // Server-side Duration Calculation & Validation
    let computedDuration = Number(durationMinutes);
    let start = startTime ? new Date(startTime) : new Date();
    let end = endTime ? new Date(endTime) : new Date();

    if (!computedDuration || computedDuration <= 0) {
      computedDuration = Math.max(1, Math.round((end - start) / (1000 * 60)));
    }

    if (computedDuration <= 0) {
      return res.status(400).json({ message: 'Study duration must be a positive number of minutes.' });
    }
    if (computedDuration > 720) { // Max 12 hours safety boundary
      return res.status(400).json({ message: 'Study session duration cannot exceed 12 hours.' });
    }

    const sId = subjectId || (topic.subject?._id || topic.subject);
    const subject = await SubjectRepository.findById(sId);

    // 1. Create StudySession record
    const rating = recallRating || 'GOOD';
    const session = await StudySessionRepository.create({
      user: userId,
      subject: sId,
      topic: topicId,
      startTime: start,
      endTime: end,
      durationMinutes: computedDuration,
      sessionType: sessionType || 'LEARNING',
      notes: notes ? notes.trim() : '',
      recallRating: rating
    });

    // 2. Fetch past revision records for topic
    const pastRevisions = await RevisionRecordRepository.findByTopic(topicId);

    // 3. Compute next revision interval via RevisionEngine
    const revisionResult = RevisionEngine.calculateNextRevision({
      recallRating: rating,
      previousInterval: topic.intervalDays || 1,
      easeFactor: topic.easeFactor || 2.5,
      consecutiveSuccesses: topic.consecutiveSuccesses || 0,
      difficulty: topic.difficulty,
      importance: topic.importance,
      examDaysLeft: subject?.examDate ? Math.floor((new Date(subject.examDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
    });

    // 4. Compute updated topic mastery score & status
    const allSessions = await StudySessionRepository.findByTopic(topicId);
    const masteryResult = MasteryEngine.calculateMastery({
      revisionRecords: [...pastRevisions, { recallRating: rating }],
      consecutiveSuccesses: revisionResult.consecutiveSuccesses,
      nextRevisionDate: revisionResult.nextRevisionDate,
      difficulty: topic.difficulty,
      totalSessions: allSessions.length
    });

    // 5. Compute new revision priority
    const priorityResult = PriorityEngine.calculatePriority({
      nextRevisionDate: revisionResult.nextRevisionDate,
      masteryScore: masteryResult.masteryScore,
      importance: topic.importance,
      difficulty: topic.difficulty,
      examDate: subject?.examDate
    });

    // 6. Persist updated topic state
    const oldMastery = topic.masteryScore || 0;
    const oldInterval = topic.intervalDays || 1;

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

    // 7. Save RevisionRecord audit log
    const revisionRecord = await RevisionRecordRepository.create({
      user: userId,
      subject: sId,
      topic: topicId,
      studySession: session._id || session.id,
      recallRating: rating,
      oldMastery,
      newMastery: masteryResult.masteryScore,
      oldInterval,
      newInterval: revisionResult.intervalDays,
      nextRevisionDate: revisionResult.nextRevisionDate
    });

    // 8. Log Activity
    await ActivityRepository.log({
      userId,
      action: 'STUDY_SESSION_COMPLETED',
      details: {
        topicTitle: topic.title,
        durationMinutes: computedDuration,
        recallRating: rating,
        newMastery: masteryResult.masteryScore,
        nextRevisionDate: revisionResult.nextRevisionDate
      }
    });

    res.status(201).json({
      message: 'Study session recorded and revision scheduled successfully',
      session,
      topic: updatedTopic,
      revisionResult,
      masteryResult
    });
  } catch (error) {
    console.error('Create Study Session Error:', error);
    res.status(500).json({ message: 'Failed to record study session', error: error.message });
  }
};

const getStudySessions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = parseInt(req.query.limit) || 100;
    const sessions = await StudySessionRepository.findByUser(userId, limit);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch study sessions', error: error.message });
  }
};

module.exports = {
  createStudySession,
  getStudySessions
};
