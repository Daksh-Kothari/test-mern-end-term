const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const { UserRepository } = require('./User');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], 
    default: 'TODO' 
  },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  category: { type: String, default: 'General' },
  complexity: { type: String, default: '3' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, default: null },
  labels: [{ type: String, trim: true }],
  dependencies: [{ type: String }]
}, { timestamps: true });

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });

const TaskMongo = mongoose.model('Task', taskSchema);

class TaskRepository {
  static async create(data) {
    if (isMongoConnected()) {
      const task = new TaskMongo(data);
      await task.save();
      return await this.findById(task._id);
    }

    const collection = memoryDb.getCollection('tasks');
    const id = memoryDb.generateId();
    const now = new Date();
    const newTask = {
      _id: id,
      id,
      project: data.project,
      title: data.title,
      description: data.description || '',
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      category: data.category || 'General',
      complexity: data.complexity || '3',
      assignee: data.assignee || null,
      creator: data.creator,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      labels: data.labels || [],
      dependencies: data.dependencies || [],
      createdAt: now,
      updatedAt: now
    };
    collection.push(newTask);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await TaskMongo.findById(id)
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar');
    }

    const collection = memoryDb.getCollection('tasks');
    const doc = collection.find(t => t._id === id || t.id === id);
    if (!doc) return null;

    const assignee = doc.assignee ? await UserRepository.findById(doc.assignee) : null;
    const creator = doc.creator ? await UserRepository.findById(doc.creator) : null;

    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      project: doc.project,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      category: doc.category,
      complexity: doc.complexity,
      assignee: assignee ? { _id: assignee._id, name: assignee.name, email: assignee.email, avatar: assignee.avatar } : null,
      assigneeId: doc.assignee,
      creator: creator ? { _id: creator._id, name: creator.name, email: creator.email, avatar: creator.avatar } : null,
      creatorId: doc.creator,
      dueDate: doc.dueDate,
      labels: doc.labels || [],
      dependencies: doc.dependencies || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  static async findByProject(projectId, filters = {}) {
    const { search, status, priority, assignee, label } = filters;

    if (isMongoConnected()) {
      const query = { project: projectId };
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assignee) query.assignee = assignee;
      if (label) query.labels = label;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      return await TaskMongo.find(query)
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar')
        .sort({ updatedAt: -1 });
    }

    const collection = memoryDb.getCollection('tasks');
    let list = collection.filter(t => t.project === projectId || (t.project && t.project._id === projectId));

    if (status) {
      list = list.filter(t => t.status === status);
    }
    if (priority) {
      list = list.filter(t => t.priority === priority);
    }
    if (assignee) {
      list = list.filter(t => t.assignee === assignee || (t.assignee && t.assignee._id === assignee));
    }
    if (label) {
      list = list.filter(t => t.labels && t.labels.includes(label));
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(t => 
        (t.title && t.title.toLowerCase().includes(term)) || 
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    const populated = await Promise.all(list.map(t => this.findById(t._id || t.id)));
    return populated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static async findAssignedToUser(userId) {
    if (isMongoConnected()) {
      return await TaskMongo.find({ assignee: userId })
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar')
        .populate('project', 'name')
        .sort({ dueDate: 1 });
    }

    const collection = memoryDb.getCollection('tasks');
    const list = collection.filter(t => t.assignee === userId || (t.assignee && t.assignee._id === userId));
    return await Promise.all(list.map(t => this.findById(t._id || t.id)));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await TaskMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true })
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar');
    }

    const collection = memoryDb.getCollection('tasks');
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
      await TaskMongo.findByIdAndDelete(id);
      return true;
    }

    const collection = memoryDb.getCollection('tasks');
    const index = collection.findIndex(t => t._id === id || t.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { TaskMongo, TaskRepository };
