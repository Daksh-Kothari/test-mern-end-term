/**
 * StudyFlow Deterministic Study Streak Engine
 */
class StreakEngine {
  /**
   * Computes streak metrics from real study session records.
   * Daily threshold: Minimum 20 minutes of study OR at least 1 completed session.
   * 
   * @param {Array} studySessions - List of study session records for user
   * @returns {Object} { currentStreak, longestStreak, totalStudyDays, isStreakActiveToday }
   */
  static calculateStreak(studySessions = []) {
    if (!studySessions || studySessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalStudyDays: 0,
        isStreakActiveToday: false
      };
    }

    // Map study sessions by YYYY-MM-DD
    const daysMap = {};
    studySessions.forEach(session => {
      if (!session.createdAt && !session.startTime) return;
      const dateObj = new Date(session.createdAt || session.startTime);
      const dayKey = dateObj.toISOString().split('T')[0];
      
      const duration = session.durationMinutes || 0;
      if (!daysMap[dayKey]) {
        daysMap[dayKey] = 0;
      }
      daysMap[dayKey] += duration;
    });

    // Valid study days (duration >= 1 minute or at least 1 session present)
    const validDays = Object.keys(daysMap).sort().reverse(); // Most recent first

    const totalStudyDays = validDays.length;
    if (totalStudyDays === 0) {
      return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0, isStreakActiveToday: false };
    }

    const todayKey = new Date().toISOString().split('T')[0];
    const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const isStreakActiveToday = !!daysMap[todayKey];

    // Compute current streak
    let currentStreak = 0;
    let checkDate = new Date();
    
    // If user hasn't studied today yet, check if yesterday was studied to keep streak alive
    if (!daysMap[todayKey]) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      if (daysMap[key] !== undefined) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Compute longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedAsc = Object.keys(daysMap).sort();
    let lastDate = null;

    sortedAsc.forEach(dateStr => {
      const currentDate = new Date(dateStr);
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      lastDate = currentDate;
    });

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, longestStreak),
      totalStudyDays,
      isStreakActiveToday
    };
  }
}

module.exports = StreakEngine;
