/**
 * StudyFlow Deterministic Mastery Calculation Engine
 */
class MasteryEngine {
  /**
   * Calculates a topic's mastery score (0-100%) and completion status.
   * 
   * @param {Object} params
   * @param {Array} params.revisionRecords - Array of past revision objects with recallRating
   * @param {number} params.consecutiveSuccesses - Consecutive successful reviews
   * @param {Date|string} params.nextRevisionDate - Scheduled revision date
   * @param {string} params.difficulty - 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'
   * @param {number} params.totalSessions - Total study sessions completed for topic
   * @returns {Object} { masteryScore, masteryCategory, completionStatus }
   */
  static calculateMastery({
    revisionRecords = [],
    consecutiveSuccesses = 0,
    nextRevisionDate = null,
    difficulty = 'MEDIUM',
    totalSessions = 0
  }) {
    if (totalSessions === 0 && revisionRecords.length === 0) {
      return {
        masteryScore: 0,
        masteryCategory: 'Weak',
        completionStatus: 'NOT_STARTED'
      };
    }

    // 1. Base Score from consecutive successful reviews (up to 40 pts)
    const consistencyScore = Math.min(40, consecutiveSuccesses * 10);

    // 2. Recent Recall Performance Score (up to 45 pts)
    let recallScore = 0;
    if (revisionRecords.length > 0) {
      const recent = revisionRecords.slice(-5); // Look at last 5 reviews
      const weights = { FORGOT: 0, HARD: 40, GOOD: 75, EASY: 100 };
      
      let weightedSum = 0;
      let totalWeight = 0;
      
      recent.forEach((rec, idx) => {
        const weight = idx + 1; // More recent reviews carry higher weight
        const val = weights[rec.recallRating ? rec.recallRating.toUpperCase() : 'GOOD'] || 50;
        weightedSum += val * weight;
        totalWeight += weight;
      });
      
      recallScore = (weightedSum / totalWeight) * 0.45;
    } else {
      recallScore = Math.min(30, totalSessions * 10);
    }

    // 3. Total Exposure Score (up to 15 pts)
    const exposureScore = Math.min(15, totalSessions * 3);

    // 4. Overdue Penalty
    let overduePenalty = 0;
    if (nextRevisionDate) {
      const now = new Date();
      const nextDate = new Date(nextRevisionDate);
      if (nextDate < now) {
        const daysOverdue = Math.floor((now - nextDate) / (1000 * 60 * 60 * 24));
        overduePenalty = Math.min(25, daysOverdue * 4); // Lose 4% per day overdue, max 25%
      }
    }

    // Combine formula components
    let totalMastery = Math.round(consistencyScore + recallScore + exposureScore - overduePenalty);
    totalMastery = Math.max(0, Math.min(100, totalMastery));

    // Categorize
    let masteryCategory = 'Weak';
    if (totalMastery >= 80) masteryCategory = 'Mastered';
    else if (totalMastery >= 60) masteryCategory = 'Good';
    else if (totalMastery >= 40) masteryCategory = 'Developing';

    // Map Completion Status
    let completionStatus = 'LEARNING';
    if (totalMastery >= 80) completionStatus = 'MASTERED';
    else if (totalMastery >= 50) completionStatus = 'REVIEWING';
    else if (totalSessions > 0) completionStatus = 'LEARNING';

    return {
      masteryScore: totalMastery,
      masteryCategory,
      completionStatus
    };
  }
}

module.exports = MasteryEngine;
