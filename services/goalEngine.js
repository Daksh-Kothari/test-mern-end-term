/**
 * StudyFlow Deterministic Study Goal Progress Engine
 */
class GoalEngine {
  /**
   * Evaluates user goals against actual study activity data.
   * 
   * @param {Object} goal - Goal record
   * @param {Object} data - Activity data containing studySessions, revisionRecords, topics
   * @returns {Object} { currentValue, progressPercentage, status }
   */
  static evaluateGoal(goal, data = {}) {
    const { studySessions = [], revisionRecords = [], topics = [] } = data;
    const startDate = new Date(goal.startDate || goal.createdAt);
    const endDate = goal.endDate ? new Date(goal.endDate) : null;
    const now = new Date();

    let currentValue = 0;

    switch (goal.goalType) {
      case 'DAILY_STUDY_TIME': {
        const isSameDay = (d1, d2) => {
          const a = new Date(d1);
          const b = new Date(d2);
          return a.getFullYear() === b.getFullYear() &&
                 a.getMonth() === b.getMonth() &&
                 a.getDate() === b.getDate();
        };
        currentValue = studySessions
          .filter(s => isSameDay(s.createdAt || s.startTime, now))
          .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        break;
      }

      case 'WEEKLY_STUDY_TIME': {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentValue = studySessions
          .filter(s => new Date(s.createdAt || s.startTime) >= sevenDaysAgo)
          .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        break;
      }

      case 'TOPICS_COMPLETED': {
        currentValue = topics.filter(t => t.completionStatus === 'MASTERED' || t.masteryScore >= 80).length;
        break;
      }

      case 'REVISIONS_COMPLETED': {
        currentValue = revisionRecords.filter(r => new Date(r.createdAt) >= startDate).length;
        break;
      }

      case 'SUBJECT_PROGRESS': {
        if (topics.length === 0) currentValue = 0;
        else {
          const totalMastery = topics.reduce((sum, t) => sum + (t.masteryScore || 0), 0);
          currentValue = Math.round(totalMastery / topics.length);
        }
        break;
      }

      default:
        currentValue = goal.currentValue || 0;
    }

    const target = goal.targetValue || 1;
    const progressPercentage = Math.min(100, Math.round((currentValue / target) * 100));

    let status = 'ACTIVE';
    if (progressPercentage >= 100) {
      status = 'COMPLETED';
    } else if (endDate && endDate < now) {
      status = 'EXPIRED';
    }

    return {
      currentValue,
      progressPercentage,
      status
    };
  }
}

module.exports = GoalEngine;
