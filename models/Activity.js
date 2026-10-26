const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { 
    type: String, 
    required: true,
    enum: [
      'SUBJECT_CREATED', 
      'SUBJECT_UPDATED',
      'SUBJECT_DELETED',
      'TOPIC_CREATED', 
      'TOPIC_UPDATED', 
      'TOPIC_DELETED',
      'STUDY_SESSION_COMPLETED',
      'REVISION_COMPLETED',
      'EXAM_CREATED',
      'EXAM_UPDATED',
      'GOAL_CREATED',
      'GOAL_COMPLETED'
    ]
  },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

activitySchema.index({ user: 1, createdAt: -1 });

const ActivityMongo = mongoose.model('Activity', activitySchema);

class ActivityRepository {
  static async log({ userId, action, details = {} }) {
    if (isMongoConnected()) {
      const act = new ActivityMongo({ user: userId, action, details });
      await act.save();
      return act;
    }

    const collection = memoryDb.getCollection('activities');
    const id = memoryDb.generateId();
    const now = new Date();
    const newAct = {
      _id: id,
      id,
      user: userId,
      action,
      details,
      createdAt: now,
      updatedAt: now
    };
    collection.push(newAct);
    memoryDb.save();
    return newAct;
  }

  static async findByUser(userId, limit = 50) {
    if (isMongoConnected()) {
      return await ActivityMongo.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    const collection = memoryDb.getCollection('activities');
    const list = collection.filter(a => a.user === userId || (a.user && a.user._id === userId));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }
}

module.exports = { ActivityMongo, ActivityRepository };
