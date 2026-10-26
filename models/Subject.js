const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const subjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6366F1' },
  icon: { type: String, default: 'BookOpen' },
  examDate: { type: Date, default: null },
  targetDate: { type: Date, default: null },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'], default: 'ACTIVE' }
}, { timestamps: true });

subjectSchema.index({ user: 1 });

const SubjectMongo = mongoose.model('Subject', subjectSchema);

class SubjectRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const subject = new SubjectMongo(data);
      await subject.save();
      return subject;
    }

    const collection = memoryDb.getCollection('subjects');
    const id = memoryDb.generateId();
    const now = new Date();
    const newSub = {
      _id: id,
      id,
      user: data.user,
      name: data.name,
      description: data.description || '',
      color: data.color || '#6366F1',
      icon: data.icon || 'BookOpen',
      examDate: data.examDate ? new Date(data.examDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
    collection.push(newSub);
    memoryDb.save();
    return newSub;
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await SubjectMongo.findById(id);
    }

    const collection = memoryDb.getCollection('subjects');
    const doc = collection.find(s => s._id === id || s.id === id);
    if (!doc) return null;
    return { ...doc, _id: doc._id || doc.id, id: doc._id || doc.id };
  }

  static async findByUser(userId) {
    if (isMongoConnected()) {
      return await SubjectMongo.find({ user: userId }).sort({ createdAt: -1 });
    }

    const collection = memoryDb.getCollection('subjects');
    const list = collection.filter(s => s.user === userId || (s.user && s.user._id === userId));
    return list.map(s => ({ ...s, _id: s._id || s.id, id: s._id || s.id }));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await SubjectMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
    }

    const collection = memoryDb.getCollection('subjects');
    const index = collection.findIndex(s => s._id === id || s.id === id);
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
      await SubjectMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('subjects');
    const index = collection.findIndex(s => s._id === id || s.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { SubjectMongo, SubjectRepository };
