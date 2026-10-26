const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['REVISION_DUE', 'REVISION_OVERDUE', 'EXAM_APPROACHING', 'GOAL_DEADLINE', 'STREAK_RISK', 'SYSTEM'], 
    default: 'SYSTEM' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedEntityId: { type: String, default: null },
  relatedEntityType: { type: String, default: null }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1 });

const NotificationMongo = mongoose.model('Notification', notificationSchema);

class NotificationRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const notif = new NotificationMongo(data);
      await notif.save();
      return notif;
    }

    const collection = memoryDb.getCollection('notifications');
    const id = memoryDb.generateId();
    const now = new Date();

    const newNotif = {
      _id: id,
      id,
      user: data.user,
      type: data.type || 'SYSTEM',
      title: data.title,
      message: data.message,
      isRead: false,
      relatedEntityId: data.relatedEntityId || null,
      relatedEntityType: data.relatedEntityType || null,
      createdAt: now,
      updatedAt: now
    };

    collection.push(newNotif);
    memoryDb.save();
    return newNotif;
  }

  static async findByUser(userId, limit = 50) {
    if (isMongoConnected()) {
      return await NotificationMongo.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
    }

    const collection = memoryDb.getCollection('notifications');
    const list = collection.filter(n => n.user === userId || (n.user && n.user._id === userId));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  static async markAsRead(id, userId) {
    if (isMongoConnected()) {
      return await NotificationMongo.findOneAndUpdate({ _id: id, user: userId }, { isRead: true }, { new: true });
    }

    const collection = memoryDb.getCollection('notifications');
    const index = collection.findIndex(n => (n._id === id || n.id === id) && (n.user === userId || (n.user && n.user._id === userId)));
    if (index === -1) return null;

    collection[index].isRead = true;
    collection[index].updatedAt = new Date();
    memoryDb.save();
    return collection[index];
  }

  static async markAllAsRead(userId) {
    if (isMongoConnected()) {
      await NotificationMongo.updateMany({ user: userId, isRead: false }, { isRead: true });
      return true;
    }

    const collection = memoryDb.getCollection('notifications');
    collection.forEach(n => {
      if (n.user === userId || (n.user && n.user._id === userId)) {
        n.isRead = true;
        n.updatedAt = new Date();
      }
    });
    memoryDb.save();
    return true;
  }
}

module.exports = { NotificationMongo, NotificationRepository };
