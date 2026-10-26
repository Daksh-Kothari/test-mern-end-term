const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const revisionRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  studySession: { type: mongoose.Schema.Types.ObjectId, ref: 'StudySession', default: null },
  recallRating: { 
    type: String, 
    enum: ['FORGOT', 'HARD', 'GOOD', 'EASY'], 
    required: true 
  },
  oldMastery: { type: Number, required: true },
  newMastery: { type: Number, required: true },
  oldInterval: { type: Number, required: true },
  newInterval: { type: Number, required: true },
  nextRevisionDate: { type: Date, required: true }
}, { timestamps: true });

revisionRecordSchema.index({ user: 1, topic: 1 });

const RevisionRecordMongo = mongoose.model('RevisionRecord', revisionRecordSchema);

class RevisionRecordRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const rec = new RevisionRecordMongo(data);
      await rec.save();
      return rec;
    }

    const collection = memoryDb.getCollection('revisionrecords');
    const id = memoryDb.generateId();
    const now = new Date();

    const newRec = {
      _id: id,
      id,
      user: data.user,
      subject: data.subject,
      topic: data.topic,
      studySession: data.studySession || null,
      recallRating: data.recallRating,
      oldMastery: data.oldMastery,
      newMastery: data.newMastery,
      oldInterval: data.oldInterval,
      newInterval: data.newInterval,
      nextRevisionDate: new Date(data.nextRevisionDate),
      createdAt: now,
      updatedAt: now
    };

    collection.push(newRec);
    memoryDb.save();
    return newRec;
  }

  static async findByTopic(topicId) {
    if (isMongoConnected()) {
      return await RevisionRecordMongo.find({ topic: topicId }).sort({ createdAt: 1 });
    }

    const collection = memoryDb.getCollection('revisionrecords');
    const list = collection.filter(r => r.topic === topicId || (r.topic && r.topic._id === topicId));
    return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  static async findByUser(userId, limit = 100) {
    if (isMongoConnected()) {
      return await RevisionRecordMongo.find({ user: userId })
        .populate('subject', 'name color')
        .populate('topic', 'title')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    const collection = memoryDb.getCollection('revisionrecords');
    const list = collection.filter(r => r.user === userId || (r.user && r.user._id === userId));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  static async deleteBySubject(subjectId) {
    if (isMongoConnected()) {
      await RevisionRecordMongo.deleteMany({ subject: subjectId });
      return true;
    }

    const collection = memoryDb.getCollection('revisionrecords');
    const remaining = collection.filter(r => {
      const sId = r.subject?._id || r.subject?.id || r.subject;
      return String(sId) !== String(subjectId);
    });
    memoryDb.setCollection('revisionrecords', remaining);
    return true;
  }
}

module.exports = { RevisionRecordMongo, RevisionRecordRepository };
