const { SubjectRepository } = require('../models/Subject');
const { TopicRepository } = require('../models/Topic');
const { StudySessionRepository } = require('../models/StudySession');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { ExamRepository } = require('../models/Exam');
const { ActivityRepository } = require('../models/Activity');
const StreakEngine = require('../services/streakEngine');
const WeakTopicEngine = require('../services/weakTopicEngine');

const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // 1. Fetch user data
    const subjects = await SubjectRepository.findByUser(userId);
    const topics = await TopicRepository.findByUser(userId);
    const studySessions = await StudySessionRepository.findByUser(userId);
    const revisionRecords = await RevisionRecordRepository.findByUser(userId);
    const exams = await ExamRepository.findByUser(userId);
    const activity = await ActivityRepository.findByUser(userId, 15);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 2. Compute Study Times
    let todayMinutes = 0;
    let weeklyMinutes = 0;
    let monthlyMinutes = 0;

    studySessions.forEach(s => {
      const duration = s.durationMinutes || 0;
      const sDate = new Date(s.createdAt || s.startTime);
      const sStr = sDate.toISOString().split('T')[0];

      if (sStr === todayStr) todayMinutes += duration;
      if (sDate >= sevenDaysAgo) weeklyMinutes += duration;
      if (sDate >= thirtyDaysAgo) monthlyMinutes += duration;
    });

    // 3. Topic Counts & Mastery
    const totalTopics = topics.length;
    const completedTopics = topics.filter(t => t.completionStatus === 'MASTERED' || (t.masteryScore || 0) >= 80).length;
    const remainingTopics = totalTopics - completedTopics;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const revisionsDueToday = topics.filter(t => t.nextRevisionDate && new Date(t.nextRevisionDate) <= now).length;
    const revisionsOverdue = topics.filter(t => t.nextRevisionDate && new Date(t.nextRevisionDate) < startOfToday).length;

    const averageMastery = totalTopics > 0 ? Math.round(topics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / totalTopics) : 0;

    // 4. Streaks
    const streakInfo = StreakEngine.calculateStreak(studySessions);

    // 5. Weak Topics Diagnostic Analysis
    const weakTopicsList = [];
    for (const topic of topics) {
      const topicId = String(topic._id || topic.id);
      const topicRevisions = revisionRecords.filter(r => {
        const rTopic = String(r.topic?._id || r.topic?.id || r.topic);
        return rTopic === topicId;
      });
      const sId = String(topic.subject?._id || topic.subject?.id || topic.subject);
      const sub = subjects.find(s => String(s._id || s.id) === sId);

      const analysis = WeakTopicEngine.analyzeTopic(topic, topicRevisions, sub);
      if (analysis.isWeak) {
        weakTopicsList.push({
          topic,
          reasons: analysis.reasons,
          weakScore: analysis.weakScore
        });
      }
    }
    weakTopicsList.sort((a, b) => b.weakScore - a.weakScore);

    // 6. Weakest Subjects
    const subjectStats = subjects.map(sub => {
      const subId = String(sub._id || sub.id);
      const subTopics = topics.filter(t => String(t.subject?._id || t.subject?.id || t.subject) === subId);
      const subMastery = subTopics.length > 0 ? Math.round(subTopics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / subTopics.length) : 0;
      return {
        subject: sub,
        topicCount: subTopics.length,
        averageMastery: subMastery
      };
    });
    subjectStats.sort((a, b) => a.averageMastery - b.averageMastery);

    // 7. Upcoming Exams (next 30 days)
    const upcomingExams = exams
      .filter(e => new Date(e.date) >= now)
      .map(e => {
        const doc = e.toObject ? e.toObject() : e;
        return {
          ...doc,
          daysRemaining: Math.ceil((new Date(doc.date) - now) / (1000 * 60 * 60 * 24))
        };
      })
      .slice(0, 5);

    res.json({
      metrics: {
        todayMinutes,
        weeklyMinutes,
        monthlyMinutes,
        totalTopics,
        completedTopics,
        remainingTopics,
        revisionsDueToday,
        revisionsOverdue,
        averageMastery,
        currentStreak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak,
        totalStudyDays: streakInfo.totalStudyDays,
        isStreakActiveToday: streakInfo.isStreakActiveToday
      },
      weakTopics: weakTopicsList.slice(0, 10),
      weakestSubjects: subjectStats.slice(0, 5),
      upcomingExams,
      recentActivity: activity
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to compute dashboard analytics', error: error.message });
  }
};

module.exports = {
  getDashboardAnalytics
};
