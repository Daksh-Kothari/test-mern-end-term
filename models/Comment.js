const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const { UserRepository } = require('./User');

const commentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true }
}, { timestamps: true });

const CommentMongo = mongoose.model('Comment', commentSchema);

class CommentRepository {
  static async create({ taskId, authorId, content }) {
    if (isMongoConnected()) {
      const comment = new CommentMongo({ task: taskId, author: authorId, content });
      await comment.save();
      return await this.findById(comment._id);
    }

    const collection = memoryDb.getCollection('comments');
    const id = memoryDb.generateId();
    const now = new Date();
    const newComment = {
      _id: id,
      id,
      task: taskId,
      author: authorId,
      content,
      createdAt: now,
      updatedAt: now
    };
    collection.push(newComment);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await CommentMongo.findById(id).populate('author', 'name email avatar');
    }

    const collection = memoryDb.getCollection('comments');
    const doc = collection.find(c => c._id === id || c.id === id);
    if (!doc) return null;

    const author = await UserRepository.findById(doc.author);

    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      task: doc.task,
      author: author ? { _id: author._id, name: author.name, email: author.email, avatar: author.avatar } : doc.author,
      authorId: doc.author,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  static async findByTask(taskId) {
    if (isMongoConnected()) {
      return await CommentMongo.find({ task: taskId })
        .populate('author', 'name email avatar')
        .sort({ createdAt: 1 });
    }

    const collection = memoryDb.getCollection('comments');
    const list = collection.filter(c => c.task === taskId || (c.task && c.task._id === taskId));
    const populated = await Promise.all(list.map(c => this.findById(c._id || c.id)));
    return populated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  static async update(id, content) {
    if (isMongoConnected()) {
      return await CommentMongo.findByIdAndUpdate(id, { content, updatedAt: new Date() }, { new: true })
        .populate('author', 'name email avatar');
    }

    const collection = memoryDb.getCollection('comments');
    const index = collection.findIndex(c => c._id === id || c.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      content,
      updatedAt: new Date()
    };
    memoryDb.save();
    return await this.findById(id);
  }

  static async delete(id) {
    if (isMongoConnected()) {
      await CommentMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('comments');
    const index = collection.findIndex(c => c._id === id || c.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { CommentMongo, CommentRepository };
