const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  sessionType: { 
    type: String, 
    enum: ['LEARNING', 'REVISION', 'PRACTICE', 'MOCK_TEST'], 
    default: 'LEARNING' 
  },
  notes: { type: String, default: '' },
  recallRating: { 
    type: String, 
    enum: ['FORGOT', 'HARD', 'GOOD', 'EASY'], 
    default: 'GOOD' 
  }
}, { timestamps: true });

studySessionSchema.index({ user: 1, createdAt: -1 });

const StudySessionMongo = mongoose.model('StudySession', studySessionSchema);

class StudySessionRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const session = new StudySessionMongo(data);
      await session.save();
      return await this.findById(session._id);
    }

    const collection = memoryDb.getCollection('studysessions');
    const id = memoryDb.generateId();
    const now = new Date();

    const newSession = {
      _id: id,
      id,
      user: data.user,
      subject: data.subject,
      topic: data.topic,
      startTime: data.startTime ? new Date(data.startTime) : now,
      endTime: data.endTime ? new Date(data.endTime) : now,
      durationMinutes: data.durationMinutes,
      sessionType: data.sessionType || 'LEARNING',
      notes: data.notes || '',
      recallRating: data.recallRating || 'GOOD',
      createdAt: now,
      updatedAt: now
    };

    collection.push(newSession);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await StudySessionMongo.findById(id)
        .populate('subject', 'name color icon')
        .populate('topic', 'title difficulty importance');
    }

    const collection = memoryDb.getCollection('studysessions');
    const doc = collection.find(s => s._id === id || s.id === id);
    if (!doc) return null;

    const { SubjectRepository } = require('./Subject');
    const { TopicRepository } = require('./Topic');

    const subject = await SubjectRepository.findById(doc.subject);
    const topic = await TopicRepository.findById(doc.topic);

    return {
      ...doc,
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      subject: subject ? { _id: subject._id, name: subject.name, color: subject.color, icon: subject.icon } : doc.subject,
      topic: topic ? { _id: topic._id, title: topic.title, difficulty: topic.difficulty, importance: topic.importance } : doc.topic
    };
  }

  static async findByUser(userId, limit = 100) {
    if (isMongoConnected()) {
      return await StudySessionMongo.find({ user: userId })
        .populate('subject', 'name color icon')
        .populate('topic', 'title difficulty importance')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    const collection = memoryDb.getCollection('studysessions');
    const list = collection.filter(s => s.user === userId || (s.user && s.user._id === userId));
    const populated = await Promise.all(list.map(s => this.findById(s._id || s.id)));
    return populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  static async findByTopic(topicId) {
    if (isMongoConnected()) {
      return await StudySessionMongo.find({ topic: topicId }).sort({ createdAt: -1 });
    }

    const collection = memoryDb.getCollection('studysessions');
    const list = collection.filter(s => s.topic === topicId || (s.topic && s.topic._id === topicId));
    return list.map(s => ({ ...s, _id: s._id || s.id, id: s._id || s.id }));
  }

  static async deleteBySubject(subjectId) {
    if (isMongoConnected()) {
      await StudySessionMongo.deleteMany({ subject: subjectId });
      return true;
    }

    const collection = memoryDb.getCollection('studysessions');
    const remaining = collection.filter(s => {
      const sId = s.subject?._id || s.subject?.id || s.subject;
      return String(sId) !== String(subjectId);
    });
    memoryDb.setCollection('studysessions', remaining);
    return true;
  }
}

module.exports = { StudySessionMongo, StudySessionRepository };
