const { ExamRepository } = require('../models/Exam');
const { SubjectRepository } = require('../models/Subject');
const { TopicRepository } = require('../models/Topic');
const { ActivityRepository } = require('../models/Activity');

const createExam = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { subjectId, name, date, description, importance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Exam name is required.' });
    }
    if (!subjectId) {
      return res.status(400).json({ message: 'Subject ID is required for exam creation.' });
    }
    if (!date) {
      return res.status(400).json({ message: 'Exam date is required.' });
    }

    const subject = await SubjectRepository.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const subUserId = subject.user?._id || subject.user?.id || subject.user;
    if (String(subUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Subject belongs to another user.' });
    }

    const exam = await ExamRepository.create({
      user: userId,
      subject: subjectId,
      name: name.trim(),
      date: new Date(date),
      description: description ? description.trim() : '',
      importance: importance || 'HIGH'
    });

    // Also update subject examDate field for convenience
    await SubjectRepository.update(subjectId, { examDate: new Date(date) });

    await ActivityRepository.log({
      userId,
      action: 'EXAM_CREATED',
      details: { examName: exam.name, subjectName: subject.name, date: exam.date }
    });

    res.status(201).json({ message: 'Exam scheduled successfully', exam });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create exam', error: error.message });
  }
};

const getExams = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const exams = await ExamRepository.findByUser(userId);

    const now = new Date();
    const enrichedExams = await Promise.all(exams.map(async (exam) => {
      const sId = exam.subject?._id || exam.subject;
      const topics = await TopicRepository.findByUser(userId, { subjectId: sId });

      const daysRemaining = Math.max(0, Math.ceil((new Date(exam.date) - now) / (1000 * 60 * 60 * 24)));
      const totalTopics = topics.length;
      const totalMastery = totalTopics > 0 ? Math.round(topics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / totalTopics) : 0;
      const weakTopicsCount = topics.filter(t => (t.masteryScore || 0) < 60).length;
      const dueRevisionsCount = topics.filter(t => t.nextRevisionDate && new Date(t.nextRevisionDate) <= now).length;

      const doc = exam.toObject ? exam.toObject() : exam;
      return {
        ...doc,
        _id: doc._id || doc.id,
        id: doc._id || doc.id,
        daysRemaining,
        subjectMastery: totalMastery,
        totalTopics,
        weakTopicsCount,
        dueRevisionsCount
      };
    }));

    res.json({ exams: enrichedExams });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch exams', error: error.message });
  }
};

const updateExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const userId = req.user._id || req.user.id;

    const exam = await ExamRepository.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const eUserId = exam.user?._id || exam.user?.id || exam.user;
    if (String(eUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private exam' });
    }

    const { name, date, description, importance } = req.body;
    const updated = await ExamRepository.update(examId, {
      name,
      date: date ? new Date(date) : undefined,
      description,
      importance
    });

    res.json({ message: 'Exam updated successfully', exam: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update exam', error: error.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const userId = req.user._id || req.user.id;

    const exam = await ExamRepository.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const eUserId = exam.user?._id || exam.user?.id || exam.user;
    if (String(eUserId) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied: Private exam' });
    }

    const subjectId = exam.subject?._id || exam.subject?.id || exam.subject;
    await ExamRepository.delete(examId);

    // If subject was associated, clear its examDate if no other exams exist for it
    if (subjectId) {
      const remainingExams = await ExamRepository.findByUser(userId);
      const otherExamForSubject = remainingExams.find(e => {
        const sId = e.subject?._id || e.subject?.id || e.subject;
        return String(sId) === String(subjectId) && String(e._id || e.id) !== String(examId);
      });
      if (!otherExamForSubject) {
        await SubjectRepository.update(subjectId, { examDate: null });
      }
    }

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete exam', error: error.message });
  }
};

module.exports = {
  createExam,
  getExams,
  updateExam,
  deleteExam
};
