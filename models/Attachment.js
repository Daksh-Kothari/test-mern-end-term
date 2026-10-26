const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const { UserRepository } = require('./User');

const attachmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true }
}, { timestamps: true });

const AttachmentMongo = mongoose.model('Attachment', attachmentSchema);

class AttachmentRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const att = new AttachmentMongo(data);
      await att.save();
      return await this.findById(att._id);
    }

    const collection = memoryDb.getCollection('attachments');
    const id = memoryDb.generateId();
    const now = new Date();
    const newAtt = {
      _id: id,
      id,
      task: data.task,
      uploader: data.uploader,
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      path: data.path,
      createdAt: now,
      updatedAt: now
    };
    collection.push(newAtt);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await AttachmentMongo.findById(id).populate('uploader', 'name email avatar');
    }

    const collection = memoryDb.getCollection('attachments');
    const doc = collection.find(a => a._id === id || a.id === id);
    if (!doc) return null;

    const uploader = await UserRepository.findById(doc.uploader);

    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      task: doc.task,
      uploader: uploader ? { _id: uploader._id, name: uploader.name, email: uploader.email, avatar: uploader.avatar } : doc.uploader,
      uploaderId: doc.uploader,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      path: doc.path,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  static async findByTask(taskId) {
    if (isMongoConnected()) {
      return await AttachmentMongo.find({ task: taskId })
        .populate('uploader', 'name email avatar')
        .sort({ createdAt: -1 });
    }

    const collection = memoryDb.getCollection('attachments');
    const list = collection.filter(a => a.task === taskId || (a.task && a.task._id === taskId));
    const populated = await Promise.all(list.map(a => this.findById(a._id || a.id)));
    return populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async delete(id) {
    if (isMongoConnected()) {
      await AttachmentMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('attachments');
    const index = collection.findIndex(a => a._id === id || a.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { AttachmentMongo, AttachmentRepository };
