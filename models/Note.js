const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  studySession: { type: mongoose.Schema.Types.ObjectId, ref: 'StudySession', default: null },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true }
}, { timestamps: true });

noteSchema.index({ user: 1, topic: 1 });

const NoteMongo = mongoose.model('Note', noteSchema);

class NoteRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const note = new NoteMongo(data);
      await note.save();
      return note;
    }

    const collection = memoryDb.getCollection('notes');
    const id = memoryDb.generateId();
    const now = new Date();

    const newNote = {
      _id: id,
      id,
      user: data.user,
      subject: data.subject || null,
      topic: data.topic || null,
      studySession: data.studySession || null,
      title: data.title,
      content: data.content,
      createdAt: now,
      updatedAt: now
    };

    collection.push(newNote);
    memoryDb.save();
    return newNote;
  }

  static async findByUser(userId, filters = {}) {
    const { topicId, subjectId } = filters;

    if (isMongoConnected()) {
      const query = { user: userId };
      if (topicId) query.topic = topicId;
      if (subjectId) query.subject = subjectId;
      return await NoteMongo.find(query).sort({ updatedAt: -1 });
    }

    const collection = memoryDb.getCollection('notes');
    let list = collection.filter(n => n.user === userId || (n.user && n.user._id === userId));

    if (topicId) {
      list = list.filter(n => n.topic === topicId || (n.topic && n.topic._id === topicId));
    }
    if (subjectId) {
      list = list.filter(n => n.subject === subjectId || (n.subject && n.subject._id === subjectId));
    }

    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static async update(id, updates, userId) {
    if (isMongoConnected()) {
      return await NoteMongo.findOneAndUpdate({ _id: id, user: userId }, { ...updates, updatedAt: new Date() }, { new: true });
    }

    const collection = memoryDb.getCollection('notes');
    const index = collection.findIndex(n => (n._id === id || n.id === id) && (n.user === userId || (n.user && n.user._id === userId)));
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...updates,
      updatedAt: new Date()
    };
    memoryDb.save();
    return collection[index];
  }

  static async delete(id, userId) {
    if (isMongoConnected()) {
      const result = await NoteMongo.deleteOne({ _id: id, user: userId });
      return result.deletedCount > 0;
    }

    const collection = memoryDb.getCollection('notes');
    const index = collection.findIndex(n => (n._id === id || n.id === id) && (n.user === userId || (n.user && n.user._id === userId)));
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }

  static async deleteBySubject(subjectId) {
    if (isMongoConnected()) {
      await NoteMongo.deleteMany({ subject: subjectId });
      return true;
    }

    const collection = memoryDb.getCollection('notes');
    const remaining = collection.filter(n => {
      const sId = n.subject?._id || n.subject?.id || n.subject;
      return String(sId) !== String(subjectId);
    });
    memoryDb.setCollection('notes', remaining);
    return true;
  }
}

module.exports = { NoteMongo, NoteRepository };
