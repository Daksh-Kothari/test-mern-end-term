/**
 * StudyFlow Deterministic Revision Priority Engine
 */
class PriorityEngine {
  /**
   * Computes a topic's revision priority score and priority classification.
   * 
   * @param {Object} params
   * @param {Date|string} params.nextRevisionDate - Scheduled review date
   * @param {number} params.masteryScore - Current topic mastery (0-100)
   * @param {string} params.importance - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
   * @param {string} params.difficulty - 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'
   * @param {Date|string|null} params.examDate - Exam date for the subject
   * @returns {Object} { priorityScore, priorityLevel }
   */
  static calculatePriority({
    nextRevisionDate,
    masteryScore = 50,
    importance = 'MEDIUM',
    difficulty = 'MEDIUM',
    examDate = null
  }) {
    const now = new Date();
    let overdueDays = 0;

    if (nextRevisionDate) {
      const nextDate = new Date(nextRevisionDate);
      if (nextDate <= now) {
        overdueDays = Math.max(0, Math.floor((now - nextDate) / (1000 * 60 * 60 * 24)));
      }
    }

    // 1. Overdue Score (Up to 40 pts)
    const overdueScore = Math.min(40, overdueDays * 10 + (nextRevisionDate && new Date(nextRevisionDate) <= now ? 10 : 0));

    // 2. Mastery Gap Score (Up to 30 pts)
    const masteryGapScore = Math.round((100 - masteryScore) * 0.3);

    // 3. Importance Weight
    const importanceScores = {
      'LOW': 5,
      'MEDIUM': 10,
      'HIGH': 20,
      'CRITICAL': 30
    };
    const importanceScore = importanceScores[importance.toUpperCase()] || 10;

    // 4. Difficulty Weight
    const difficultyScores = {
      'EASY': 5,
      'MEDIUM': 10,
      'HARD': 15,
      'VERY_HARD': 20
    };
    const difficultyScore = difficultyScores[difficulty.toUpperCase()] || 10;

    // 5. Exam Proximity Score (Up to 30 pts)
    let examScore = 0;
    if (examDate) {
      const eDate = new Date(examDate);
      const daysUntilExam = Math.floor((eDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntilExam >= 0 && daysUntilExam <= 30) {
        examScore = Math.round((30 - daysUntilExam) * 1.5);
      }
    }

    const totalPriorityScore = overdueScore + masteryGapScore + importanceScore + difficultyScore + examScore;

    let priorityLevel = 'LOW';
    if (totalPriorityScore >= 80) priorityLevel = 'CRITICAL';
    else if (totalPriorityScore >= 55) priorityLevel = 'HIGH';
    else if (totalPriorityScore >= 30) priorityLevel = 'MEDIUM';

    return {
      priorityScore: totalPriorityScore,
      priorityLevel,
      overdueDays
    };
  }
}

module.exports = PriorityEngine;
