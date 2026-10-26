const { TopicRepository, TopicMongo } = require('../models/Topic');
const { SubjectRepository } = require('../models/Subject');
const { ActivityRepository } = require('../models/Activity');
const { RevisionRecordMongo } = require('../models/RevisionRecord');
const { StudySessionMongo } = require('../models/StudySession');
const { NoteMongo } = require('../models/Note');
const { isMongoConnected, memoryDb } = require('../config/db');
const PriorityEngine = require('../services/priorityEngine');

const createTopic = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { subjectId, title, description, difficulty, importance } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Topic title is required.' });
    }
    if (!subjectId) {
      return res.status(400).json({ message: 'Subject ID is required for topic creation.' });
    }

    const subject = await SubjectRepository.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const subUserId = subject.user?._id || subject.user?.id || subject.user;
    if (String(subUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Subject belongs to another user.' });
    }

    const initialNextDate = new Date();
    initialNextDate.setDate(initialNextDate.getDate() + 1);

    const priorityInfo = PriorityEngine.calculatePriority({
      nextRevisionDate: initialNextDate,
      masteryScore: 0,
      importance: importance || 'MEDIUM',
      difficulty: difficulty || 'MEDIUM',
      examDate: subject.examDate
    });

    const topic = await TopicRepository.create({
      user: userId,
      subject: subjectId,
      title: title.trim(),
      description: description ? description.trim() : '',
      difficulty: difficulty || 'MEDIUM',
      importance: importance || 'MEDIUM',
      completionStatus: 'NOT_STARTED',
      masteryScore: 0,
      consecutiveSuccesses: 0,
      nextRevisionDate: initialNextDate,
      priorityScore: priorityInfo.priorityScore,
      priorityLevel: priorityInfo.priorityLevel
    });

    await ActivityRepository.log({
      userId,
      action: 'TOPIC_CREATED',
      details: { topicTitle: topic.title, subjectName: subject.name }
    });

    res.status(201).json({ message: 'Topic created successfully', topic });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create topic', error: error.message });
  }
};

const getTopics = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { subjectId, search, difficulty, importance, completionStatus, isOverdue } = req.query;

    const topics = await TopicRepository.findByUser(userId, {
      subjectId,
      search,
      difficulty,
      importance,
      completionStatus,
      isOverdue: isOverdue === 'true'
    });

    res.json({ topics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch topics', error: error.message });
  }
};

const getTopicById = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id || req.user.id;

    const topic = await TopicRepository.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const tUserId = topic.user?._id || topic.user?.id || topic.user;
    if (String(tUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private topic' });
    }

    res.json({ topic });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch topic', error: error.message });
  }
};

const updateTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id || req.user.id;

    const topic = await TopicRepository.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const tUserId = topic.user?._id || topic.user?.id || topic.user;
    if (String(tUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private topic' });
    }

    const { title, description, difficulty, importance, completionStatus, masteryScore } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (importance !== undefined) updates.importance = importance;
    if (completionStatus !== undefined) updates.completionStatus = completionStatus;
    if (masteryScore !== undefined) updates.masteryScore = Math.max(0, Math.min(100, Number(masteryScore)));

    // Recalculate priority with new metadata
    const updatedDifficulty = updates.difficulty || topic.difficulty;
    const updatedImportance = updates.importance || topic.importance;
    const updatedMastery = updates.masteryScore !== undefined ? updates.masteryScore : topic.masteryScore;

    const priorityInfo = PriorityEngine.calculatePriority({
      nextRevisionDate: topic.nextRevisionDate,
      masteryScore: updatedMastery,
      importance: updatedImportance,
      difficulty: updatedDifficulty,
      examDate: topic.subject?.examDate
    });

    updates.priorityScore = priorityInfo.priorityScore;
    updates.priorityLevel = priorityInfo.priorityLevel;

    const updatedTopic = await TopicRepository.update(topicId, updates);

    await ActivityRepository.log({
      userId,
      action: 'TOPIC_UPDATED',
      details: { topicTitle: updatedTopic.title }
    });

    res.json({ message: 'Topic updated successfully', topic: updatedTopic });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update topic', error: error.message });
  }
};

const deleteTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id || req.user.id;

    const topic = await TopicRepository.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const tUserId = topic.user?._id || topic.user?.id || topic.user;
    if (String(tUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private topic' });
    }

    // Cascade delete topic-related records
    if (isMongoConnected()) {
      await Promise.all([
        TopicRepository.delete(topicId),
        RevisionRecordMongo.deleteMany({ topic: topicId }),
        StudySessionMongo.deleteMany({ topic: topicId }),
        NoteMongo.deleteMany({ topic: topicId })
      ]);
    } else {
      await TopicRepository.delete(topicId);
      memoryDb.setCollection('revisionrecords', memoryDb.getCollection('revisionrecords').filter(r => {
        const tId = r.topic?._id || r.topic?.id || r.topic;
        return String(tId) !== String(topicId);
      }));
      memoryDb.setCollection('studysessions', memoryDb.getCollection('studysessions').filter(s => {
        const tId = s.topic?._id || s.topic?.id || s.topic;
        return String(tId) !== String(topicId);
      }));
      memoryDb.setCollection('notes', memoryDb.getCollection('notes').filter(n => {
        const tId = n.topic?._id || n.topic?.id || n.topic;
        return String(tId) !== String(topicId);
      }));
    }

    await ActivityRepository.log({
      userId,
      action: 'TOPIC_DELETED',
      details: { topicTitle: topic.title }
    });

    res.json({ message: 'Topic and associated records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete topic', error: error.message });
  }
};

module.exports = {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic
};
