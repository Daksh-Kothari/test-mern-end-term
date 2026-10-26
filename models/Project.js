const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const { UserRepository } = require('./User');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  projectType: { 
    type: String, 
    enum: ['Web', 'Mobile', 'API', 'CLI', 'Microservice', 'DevOps'], 
    default: 'Web' 
  },
  repoUrl: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'], default: 'ACTIVE' }
}, { timestamps: true });

const ProjectMongo = mongoose.model('Project', projectSchema);

class ProjectRepository {
  static async create({ name, description, projectType = 'Web', repoUrl = '', ownerId }) {
    if (isMongoConnected()) {
      const proj = new ProjectMongo({
        name,
        description,
        projectType,
        repoUrl,
        owner: ownerId
      });
      await proj.save();
      return await this.findById(proj._id);
    }

    const collection = memoryDb.getCollection('projects');
    const id = memoryDb.generateId();
    const now = new Date();
    const newProject = {
      _id: id,
      id,
      name,
      description,
      projectType,
      repoUrl,
      owner: ownerId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
    collection.push(newProject);
    memoryDb.save();
    return await this.findById(id);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await ProjectMongo.findById(id).populate('owner', 'name email avatar');
    }
    const collection = memoryDb.getCollection('projects');
    const doc = collection.find(p => p._id === id || p.id === id);
    if (!doc) return null;
    
    const owner = await UserRepository.findById(doc.owner);
    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      name: doc.name,
      description: doc.description,
      projectType: doc.projectType,
      repoUrl: doc.repoUrl,
      owner: owner ? { _id: owner._id, name: owner.name, email: owner.email, avatar: owner.avatar } : doc.owner,
      ownerId: doc.owner,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  static async findByUser(userId) {
    // A user sees projects where they are owner OR member
    const { ProjectMemberRepository } = require('./ProjectMember');
    const memberships = await ProjectMemberRepository.findProjectsForUser(userId);
    const projectIds = memberships.map(m => m.project._id || m.project);

    if (isMongoConnected()) {
      return await ProjectMongo.find({ _id: { $in: projectIds } })
        .populate('owner', 'name email avatar')
        .sort({ updatedAt: -1 });
    }

    const collection = memoryDb.getCollection('projects');
    const list = collection.filter(p => projectIds.includes(p._id || p.id));
    
    const populated = await Promise.all(list.map(p => this.findById(p._id || p.id)));
    return populated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static async update(id, updates) {
    if (isMongoConnected()) {
      return await ProjectMongo.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true })
        .populate('owner', 'name email avatar');
    }

    const collection = memoryDb.getCollection('projects');
    const index = collection.findIndex(p => p._id === id || p.id === id);
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
      await ProjectMongo.findByIdAndDelete(id);
      return true;
    }
    const collection = memoryDb.getCollection('projects');
    const index = collection.findIndex(p => p._id === id || p.id === id);
    if (index !== -1) {
      collection.splice(index, 1);
      memoryDb.save();
      return true;
    }
    return false;
  }
}

module.exports = { ProjectMongo, ProjectRepository };
