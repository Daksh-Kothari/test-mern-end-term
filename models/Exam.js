const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const examSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  description: { type: String, default: '' },
  importance: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH'
  }
}, { timestamps: true });

examSchema.index({ user: 1, date: 1 });

const ExamMongo = mongoose.model('Exam', examSchema);

class ExamRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const exam = new ExamMongo(data);
      await exam.save();
      return await this.findById(exam._id);
    }

    const collection = memoryDb.getCollection('exams');
    const id = memoryDb.generateId();
    const now = new Date();

    const newExam = {
      _id: id,
      id,
      user: data.user,
      subject: data.subject,
      name: data.name,
      date: new Date(data.date),
      description: data.description || '',
      importance: data.importance || 'HIGH',
      createdAt: now,
      updatedAt: now
    };

    collection.push(newExam);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await ExamMongo.findById(id).populate('subject', 'name color icon');
    }

    const collection = memoryDb.getCollection('exams');
    const doc = collection.find(e => e._id === id || e.id === id);
    if (!doc) return null;

    const { SubjectRepository } = require('./Subject');
    const subject = await SubjectRepository.findById(doc.subject);

    return {
      ...doc,
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      subject: subject ? { _id: subject._id, name: subject.name, color: subject.color, icon: subject.icon } : doc.subject
    };
  }

  static async findByUser(userId) {
    if (isMongoConnected()) {
      return await ExamMongo.find({ user: userId }).populate('subject', 'name color icon').sort({ date: 1 });
    }

    const collection = memoryDb.getCollection('exams');
    const list = collection.filter(e => e.user === userId || (e.user && e.user._id === userId));
    const populated = await Promise.all(list.map(e => this.findById(e._id || e.id)));
    return populated.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await ExamMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true })
        .populate('subject', 'name color icon');
    }

    const collection = memoryDb.getCollection('exams');
    const index = collection.findIndex(e => e._id === id || e.id === id);
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
      await ExamMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('exams');
    const index = collection.findIndex(e => e._id === id || e.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }

  static async deleteBySubject(subjectId) {
    if (isMongoConnected()) {
      await ExamMongo.deleteMany({ subject: subjectId });
      return true;
    }

    const collection = memoryDb.getCollection('exams');
    const remaining = collection.filter(e => {
      const sId = e.subject?._id || e.subject?.id || e.subject;
      return String(sId) !== String(subjectId);
    });
    memoryDb.setCollection('exams', remaining);
    return true;
  }
}

module.exports = { ExamMongo, ExamRepository };
