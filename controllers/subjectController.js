const { SubjectRepository } = require('../models/Subject');
const { TopicRepository } = require('../models/Topic');
const { ExamRepository } = require('../models/Exam');
const { StudySessionRepository } = require('../models/StudySession');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { NoteRepository } = require('../models/Note');
const { ActivityRepository } = require('../models/Activity');

const createSubject = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, description, color, icon, examDate, targetDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const subject = await SubjectRepository.create({
      user: userId,
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || '#6366F1',
      icon: icon || 'BookOpen',
      examDate: examDate ? new Date(examDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null
    });

    // Automatically schedule exam if examDate was provided
    if (examDate) {
      await ExamRepository.create({
        user: userId,
        subject: subject._id || subject.id,
        name: `${subject.name.trim()} Exam`,
        date: new Date(examDate),
        description: `Scheduled exam for ${subject.name.trim()}`,
        importance: 'HIGH'
      });
    }

    await ActivityRepository.log({
      userId,
      action: 'SUBJECT_CREATED',
      details: { subjectName: subject.name }
    });

    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create subject', error: error.message });
  }
};

const getSubjects = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const subjects = await SubjectRepository.findByUser(userId);

    // Compute progress & topic counts for each subject
    const enrichedSubjects = await Promise.all(subjects.map(async (sub) => {
      const sId = sub._id || sub.id;
      const topics = await TopicRepository.findByUser(userId, { subjectId: sId });
      
      const totalTopics = topics.length;
      const masteredTopics = topics.filter(t => t.completionStatus === 'MASTERED' || t.masteryScore >= 80).length;
      const totalMastery = totalTopics > 0 ? Math.round(topics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / totalTopics) : 0;
      
      const doc = sub.toObject ? sub.toObject() : sub;
      return {
        ...doc,
        _id: doc._id || doc.id,
        id: doc._id || doc.id,
        totalTopics,
        masteredTopics,
        averageMastery: totalMastery
      };
    }));

    res.json({ subjects: enrichedSubjects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
  }
};

const getSubjectById = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const userId = req.user._id || req.user.id;

    const subject = await SubjectRepository.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subUserId = subject.user?._id || subject.user?.id || subject.user;
    if (String(subUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private subject' });
    }

    const topics = await TopicRepository.findByUser(userId, { subjectId });

    res.json({ subject, topics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subject details', error: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const userId = req.user._id || req.user.id;

    const existing = await SubjectRepository.findById(subjectId);
    if (!existing) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subUserId = existing.user?._id || existing.user?.id || existing.user;
    if (String(subUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private subject' });
    }

    const { name, description, color, icon, examDate, targetDate, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (examDate !== undefined) updates.examDate = examDate ? new Date(examDate) : null;
    if (targetDate !== undefined) updates.targetDate = targetDate ? new Date(targetDate) : null;
    if (status !== undefined) updates.status = status;

    const updated = await SubjectRepository.update(subjectId, updates);

    // Synchronize Exam if examDate or name was changed
    if (examDate !== undefined) {
      const userExams = await ExamRepository.findByUser(userId);
      const linkedExam = userExams.find(e => {
        const sId = e.subject?._id || e.subject?.id || e.subject;
        return String(sId) === String(subjectId);
      });

      if (examDate) {
        if (linkedExam) {
          await ExamRepository.update(linkedExam._id || linkedExam.id, {
            name: name !== undefined ? `${name.trim()} Exam` : linkedExam.name,
            date: new Date(examDate)
          });
        } else {
          await ExamRepository.create({
            user: userId,
            subject: subjectId,
            name: `${(name || updated.name).trim()} Exam`,
            date: new Date(examDate),
            description: `Scheduled exam for ${(name || updated.name).trim()}`,
            importance: 'HIGH'
          });
        }
      } else if (examDate === null && linkedExam) {
        // If examDate was explicitly cleared, remove the corresponding exam
        await ExamRepository.delete(linkedExam._id || linkedExam.id);
      }
    }

    await ActivityRepository.log({
      userId,
      action: 'SUBJECT_UPDATED',
      details: { subjectName: updated.name }
    });

    res.json({ message: 'Subject updated successfully', subject: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subject', error: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const userId = req.user._id || req.user.id;

    const existing = await SubjectRepository.findById(subjectId);
    if (!existing) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subUserId = existing.user?._id || existing.user?.id || existing.user;
    if (String(subUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private subject' });
    }

    // Cascading delete: delete all topics, exams, study sessions, revision records, and notes for this subject
    await Promise.all([
      TopicRepository.deleteBySubject(subjectId),
      ExamRepository.deleteBySubject(subjectId),
      StudySessionRepository.deleteBySubject(subjectId),
      RevisionRecordRepository.deleteBySubject(subjectId),
      NoteRepository.deleteBySubject(subjectId),
      SubjectRepository.delete(subjectId)
    ]);

    await ActivityRepository.log({
      userId,
      action: 'SUBJECT_DELETED',
      details: { subjectName: existing.name }
    });

    res.json({ message: 'Subject and all associated topics and exams deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete subject', error: error.message });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
};
