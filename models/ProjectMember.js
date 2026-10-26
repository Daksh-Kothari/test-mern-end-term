const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const { UserRepository } = require('./User');

const projectMemberSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['OWNER', 'MEMBER', 'ADMIN'], default: 'MEMBER' },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

const ProjectMemberMongo = mongoose.model('ProjectMember', projectMemberSchema);

class ProjectMemberRepository {
  static async addMember({ projectId, userId, role = 'MEMBER' }) {
    if (isMongoConnected()) {
      const existing = await ProjectMemberMongo.findOne({ project: projectId, user: userId });
      if (existing) return existing;

      const pm = new ProjectMemberMongo({ project: projectId, user: userId, role });
      await pm.save();
      return await pm.populate('user', 'name email avatar role');
    }

    const collection = memoryDb.getCollection('projectmembers');
    const existing = collection.find(m => (m.project === projectId || m.project._id === projectId) && (m.user === userId || m.user._id === userId));
    if (existing) return existing;

    const id = memoryDb.generateId();
    const newMember = {
      _id: id,
      id,
      project: projectId,
      user: userId,
      role,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    collection.push(newMember);
    memoryDb.save();
    
    const userDoc = await UserRepository.findById(userId);
    return {
      ...newMember,
      user: userDoc ? { _id: userDoc._id, name: userDoc.name, email: userDoc.email, avatar: userDoc.avatar } : userId
    };
  }

  static async findMembersByProject(projectId) {
    if (isMongoConnected()) {
      return await ProjectMemberMongo.find({ project: projectId }).populate('user', 'name email avatar role');
    }

    const collection = memoryDb.getCollection('projectmembers');
    const matches = collection.filter(m => m.project === projectId || m.project._id === projectId);
    
    return await Promise.all(matches.map(async m => {
      const uId = typeof m.user === 'object' ? m.user._id : m.user;
      const userDoc = await UserRepository.findById(uId);
      return {
        _id: m._id || m.id,
        id: m._id || m.id,
        project: projectId,
        user: userDoc ? { _id: userDoc._id, name: userDoc.name, email: userDoc.email, avatar: userDoc.avatar } : m.user,
        role: m.role,
        joinedAt: m.joinedAt
      };
    }));
  }

  static async findProjectsForUser(userId) {
    if (isMongoConnected()) {
      return await ProjectMemberMongo.find({ user: userId });
    }

    const collection = memoryDb.getCollection('projectmembers');
    return collection.filter(m => m.user === userId || m.user._id === userId);
  }

  static async isMember(projectId, userId) {
    if (isMongoConnected()) {
      const pm = await ProjectMemberMongo.findOne({ project: projectId, user: userId });
      return pm ? pm.role : null;
    }

    const collection = memoryDb.getCollection('projectmembers');
    const match = collection.find(m => 
      (m.project === projectId || (m.project && m.project._id === projectId)) && 
      (m.user === userId || (m.user && m.user._id === userId))
    );
    return match ? match.role : null;
  }

  static async removeMember(projectId, userId) {
    if (isMongoConnected()) {
      await ProjectMemberMongo.deleteOne({ project: projectId, user: userId });
      return true;
    }

    const collection = memoryDb.getCollection('projectmembers');
    const index = collection.findIndex(m => 
      (m.project === projectId || (m.project && m.project._id === projectId)) && 
      (m.user === userId || (m.user && m.user._id === userId))
    );
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }

  static async deleteByProject(projectId) {
    if (isMongoConnected()) {
      await ProjectMemberMongo.deleteMany({ project: projectId });
      return true;
    }
    const collection = memoryDb.getCollection('projectmembers');
    this.data = collection.filter(m => m.project !== projectId && m.project._id !== projectId);
    memoryDb.data.projectmembers = this.data;
    memoryDb.save();
    return true;
  }
}

module.exports = { ProjectMemberMongo, ProjectMemberRepository };
