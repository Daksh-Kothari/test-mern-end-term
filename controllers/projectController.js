const { ProjectRepository } = require('../models/Project');
const { ProjectMemberRepository } = require('../models/ProjectMember');
const { UserRepository } = require('../models/User');
const { ActivityRepository } = require('../models/Activity');

const createProject = async (req, res) => {
  try {
    const { name, description, projectType, repoUrl } = req.body;
    const userId = req.user._id || req.user.id;

    if (!name || !description) {
      return res.status(400).json({ message: 'Project name and description are required.' });
    }

    // 1. Create project
    const project = await ProjectRepository.create({
      name: name.trim(),
      description: description.trim(),
      projectType: projectType || 'Web',
      repoUrl: repoUrl ? repoUrl.trim() : '',
      ownerId: userId
    });

    const projectId = project._id || project.id;

    // 2. Add owner as member in ProjectMember
    await ProjectMemberRepository.addMember({
      projectId: projectId,
      userId: userId,
      role: 'OWNER'
    });

    // 3. Log Activity
    await ActivityRepository.log({
      projectId: projectId,
      userId: userId,
      action: 'PROJECT_CREATED',
      details: { projectName: project.name }
    });

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
};

const getProjects = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const projects = await ProjectRepository.findByUser(userId);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id || req.user.id;

    // Server-side Authorization Check
    const memberRole = await ProjectMemberRepository.isMember(projectId, userId);
    if (!memberRole) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this project.' });
    }

    const project = await ProjectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const members = await ProjectMemberRepository.findMembersByProject(projectId);

    res.json({
      project,
      userRole: memberRole,
      members
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project details', error: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id || req.user.id;

    const memberRole = await ProjectMemberRepository.isMember(projectId, userId);
    if (!memberRole || (memberRole !== 'OWNER' && memberRole !== 'ADMIN')) {
      return res.status(403).json({ message: 'Access denied: Only project owners can edit project details.' });
    }

    const { name, description, projectType, repoUrl, status } = req.body;
    const updated = await ProjectRepository.update(projectId, {
      name,
      description,
      projectType,
      repoUrl,
      status
    });

    await ActivityRepository.log({
      projectId,
      userId,
      action: 'PROJECT_UPDATED',
      details: { updates: Object.keys(req.body) }
    });

    res.json({ message: 'Project updated successfully', project: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id || req.user.id;

    const memberRole = await ProjectMemberRepository.isMember(projectId, userId);
    if (memberRole !== 'OWNER') {
      return res.status(403).json({ message: 'Access denied: Only the project owner can delete this project.' });
    }

    await ProjectMemberRepository.deleteByProject(projectId);
    await ProjectRepository.delete(projectId);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const currentUserId = req.user._id || req.user.id;

    const memberRole = await ProjectMemberRepository.isMember(projectId, currentUserId);
    if (memberRole !== 'OWNER' && memberRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Only project owners can invite team members.' });
    }

    const { email, role = 'MEMBER' } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Member email address is required.' });
    }

    const targetUser = await UserRepository.findByEmail(email);
    if (!targetUser) {
      return res.status(404).json({ message: `User with email "${email}" not found. Ensure they have registered an account.` });
    }

    const targetUserId = targetUser._id || targetUser.id;
    const existingRole = await ProjectMemberRepository.isMember(projectId, targetUserId);
    if (existingRole) {
      return res.status(400).json({ message: 'User is already a member of this project.' });
    }

    const newMember = await ProjectMemberRepository.addMember({
      projectId,
      userId: targetUserId,
      role
    });

    await ActivityRepository.log({
      projectId,
      userId: currentUserId,
      action: 'MEMBER_INVITED',
      details: { memberName: targetUser.name, memberEmail: targetUser.email, role }
    });

    res.status(201).json({ message: 'Team member added successfully', member: newMember });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add member', error: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id || req.user.id;

    const memberRole = await ProjectMemberRepository.isMember(projectId, currentUserId);
    if (memberRole !== 'OWNER' && memberRole !== 'ADMIN' && currentUserId !== targetUserId) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions to remove member.' });
    }

    const project = await ProjectRepository.findById(projectId);
    const ownerId = project.owner?._id || project.owner?.id || project.ownerId || project.owner;
    if (String(targetUserId) === String(ownerId)) {
      return res.status(400).json({ message: 'The project owner cannot be removed from the project.' });
    }

    const targetUser = await UserRepository.findById(targetUserId);
    await ProjectMemberRepository.removeMember(projectId, targetUserId);

    await ActivityRepository.log({
      projectId,
      userId: currentUserId,
      action: 'MEMBER_REMOVED',
      details: { memberName: targetUser ? targetUser.name : targetUserId }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember
};
