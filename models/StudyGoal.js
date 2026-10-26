const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const studyGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  goalType: { 
    type: String, 
    enum: ['DAILY_STUDY_TIME', 'WEEKLY_STUDY_TIME', 'TOPICS_COMPLETED', 'REVISIONS_COMPLETED', 'SUBJECT_PROGRESS'], 
    required: true 
  },
  targetValue: { type: Number, required: true, min: 1 },
  currentValue: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'EXPIRED'], default: 'ACTIVE' }
}, { timestamps: true });

studyGoalSchema.index({ user: 1, status: 1 });

const StudyGoalMongo = mongoose.model('StudyGoal', studyGoalSchema);

class StudyGoalRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const goal = new StudyGoalMongo(data);
      await goal.save();
      return goal;
    }

    const collection = memoryDb.getCollection('studygoals');
    const id = memoryDb.generateId();
    const now = new Date();

    const newGoal = {
      _id: id,
      id,
      user: data.user,
      title: data.title,
      goalType: data.goalType,
      targetValue: data.targetValue,
      currentValue: data.currentValue || 0,
      startDate: data.startDate ? new Date(data.startDate) : now,
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    collection.push(newGoal);
    memoryDb.save();
    return newGoal;
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await StudyGoalMongo.findById(id);
    }

    const collection = memoryDb.getCollection('studygoals');
    const doc = collection.find(g => g._id === id || g.id === id);
    if (!doc) return null;
    return { ...doc, _id: doc._id || doc.id, id: doc._id || doc.id };
  }

  static async findByUser(userId) {
    if (isMongoConnected()) {
      return await StudyGoalMongo.find({ user: userId }).sort({ createdAt: -1 });
    }

    const collection = memoryDb.getCollection('studygoals');
    const list = collection.filter(g => g.user === userId || (g.user && g.user._id === userId));
    return list.map(g => ({ ...g, _id: g._id || g.id, id: g._id || g.id }));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await StudyGoalMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
    }

    const collection = memoryDb.getCollection('studygoals');
    const index = collection.findIndex(g => g._id === id || g.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...updates,
      updatedAt: new Date()
    };
    memoryDb.save();
    return { ...collection[index], _id: collection[index]._id || collection[index].id };
  }

  static async delete(id) {
    if (isMongoConnected()) {
      await StudyGoalMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('studygoals');
    const index = collection.findIndex(g => g._id === id || g.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { StudyGoalMongo, StudyGoalRepository };
