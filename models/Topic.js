const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const topicSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  difficulty: { 
    type: String, 
    enum: ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'], 
    default: 'MEDIUM' 
  },
  importance: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  completionStatus: { 
    type: String, 
    enum: ['NOT_STARTED', 'LEARNING', 'REVIEWING', 'MASTERED'], 
    default: 'NOT_STARTED' 
  },
  masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  consecutiveSuccesses: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  intervalDays: { type: Number, default: 1 },
  lastStudiedAt: { type: Date, default: null },
  nextRevisionDate: { type: Date, default: null },
  priorityScore: { type: Number, default: 50 },
  priorityLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' }
}, { timestamps: true });

topicSchema.index({ user: 1, subject: 1 });
topicSchema.index({ nextRevisionDate: 1 });

const TopicMongo = mongoose.model('Topic', topicSchema);

class TopicRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const topic = new TopicMongo(data);
      await topic.save();
      return await this.findById(topic._id);
    }

    const collection = memoryDb.getCollection('topics');
    const id = memoryDb.generateId();
    const now = new Date();

    const defaultNext = new Date();
    defaultNext.setDate(defaultNext.getDate() + 1);

    const newTopic = {
      _id: id,
      id,
      user: data.user,
      subject: data.subject,
      title: data.title,
      description: data.description || '',
      difficulty: data.difficulty || 'MEDIUM',
      importance: data.importance || 'MEDIUM',
      completionStatus: data.completionStatus || 'NOT_STARTED',
      masteryScore: data.masteryScore !== undefined ? data.masteryScore : 0,
      consecutiveSuccesses: data.consecutiveSuccesses || 0,
      easeFactor: data.easeFactor || 2.5,
      intervalDays: data.intervalDays || 1,
      lastStudiedAt: data.lastStudiedAt ? new Date(data.lastStudiedAt) : null,
      nextRevisionDate: data.nextRevisionDate ? new Date(data.nextRevisionDate) : defaultNext,
      priorityScore: data.priorityScore || 50,
      priorityLevel: data.priorityLevel || 'MEDIUM',
      createdAt: now,
      updatedAt: now
    };

    collection.push(newTopic);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await TopicMongo.findById(id).populate('subject', 'name color icon examDate');
    }

    const collection = memoryDb.getCollection('topics');
    const doc = collection.find(t => t._id === id || t.id === id);
    if (!doc) return null;

    const { SubjectRepository } = require('./Subject');
    const subject = await SubjectRepository.findById(doc.subject);

    return {
      ...doc,
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      subject: subject ? { _id: subject._id, name: subject.name, color: subject.color, icon: subject.icon, examDate: subject.examDate } : doc.subject
    };
  }

  static async findByUser(userId, filters = {}) {
    const { subjectId, search, difficulty, importance, completionStatus, isOverdue } = filters;

    if (isMongoConnected()) {
      const query = { user: userId };
      if (subjectId) query.subject = subjectId;
      if (difficulty) query.difficulty = difficulty;
      if (importance) query.importance = importance;
      if (completionStatus) query.completionStatus = completionStatus;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (isOverdue) {
        query.nextRevisionDate = { $lte: new Date() };
      }

      return await TopicMongo.find(query).populate('subject', 'name color icon examDate').sort({ priorityScore: -1 });
    }

    const collection = memoryDb.getCollection('topics');
    let list = collection.filter(t => t.user === userId || (t.user && t.user._id === userId));

    if (subjectId) {
      list = list.filter(t => t.subject === subjectId || (t.subject && t.subject._id === subjectId));
    }
    if (difficulty) {
      list = list.filter(t => t.difficulty === difficulty);
    }
    if (importance) {
      list = list.filter(t => t.importance === importance);
    }
    if (completionStatus) {
      list = list.filter(t => t.completionStatus === completionStatus);
    }
    if (isOverdue) {
      const now = new Date();
      list = list.filter(t => t.nextRevisionDate && new Date(t.nextRevisionDate) <= now);
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(t => 
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    const populated = await Promise.all(list.map(t => this.findById(t._id || t.id)));
    return populated.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await TopicMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true })
        .populate('subject', 'name color icon examDate');
    }

    const collection = memoryDb.getCollection('topics');
    const index = collection.findIndex(t => t._id === id || t.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...updates,
      updatedAt: new Date()
    };
    memoryDb.save();
    return await this.findById(id);
  }

  static async delete(id) {
    if (isMongoConnected()) {
      await TopicMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('topics');
    const index = collection.findIndex(t => t._id === id || t.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }

  static async deleteBySubject(subjectId) {
    if (isMongoConnected()) {
      await TopicMongo.deleteMany({ subject: subjectId });
      return true;
    }

    const collection = memoryDb.getCollection('topics');
    const remaining = collection.filter(t => {
      const sId = t.subject?._id || t.subject?.id || t.subject;
      return String(sId) !== String(subjectId);
    });
    memoryDb.setCollection('topics', remaining);
    return true;
  }
}

module.exports = { TopicMongo, TopicRepository };
