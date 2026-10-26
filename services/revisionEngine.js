/**
 * StudyFlow Deterministic Revision Scheduling Engine
 * Spaced Repetition Algorithm (SuperMemo SM-2 & Leitner Interval Adaptation)
 */
class RevisionEngine {
  /**
   * Calculates next revision date and interval.
   * 
   * @param {Object} params
   * @param {string} params.recallRating - 'FORGOT' (0), 'HARD' (1), 'GOOD' (2), 'EASY' (3)
   * @param {number} params.previousInterval - Days since last revision (default 1)
   * @param {number} params.easeFactor - Ease multiplier (default 2.5)
   * @param {number} params.consecutiveSuccesses - Number of consecutive non-forgot reviews
   * @param {string} params.difficulty - 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'
   * @param {string} params.importance - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
   * @param {number|null} params.examDaysLeft - Days until subject exam (if set)
   * @returns {Object} { nextRevisionDate, intervalDays, easeFactor, consecutiveSuccesses }
   */
  static calculateNextRevision({
    recallRating = 'GOOD',
    previousInterval = 1,
    easeFactor = 2.5,
    consecutiveSuccesses = 0,
    difficulty = 'MEDIUM',
    importance = 'MEDIUM',
    examDaysLeft = null
  }) {
    const rating = recallRating.toUpperCase();
    let newConsecutive = consecutiveSuccesses;
    let newEase = easeFactor;
    let newInterval = 1;

    // Difficulty modifier for ease factor calculation
    const difficultyMod = {
      'EASY': 0.1,
      'MEDIUM': 0.0,
      'HARD': -0.1,
      'VERY_HARD': -0.2
    }[difficulty] || 0.0;

    switch (rating) {
      case 'FORGOT':
        newConsecutive = 0;
        newInterval = 1;
        newEase = Math.max(1.3, easeFactor - 0.2 + difficultyMod);
        break;

      case 'HARD':
        newConsecutive = consecutiveSuccesses + 1;
        if (newConsecutive === 1) {
          newInterval = 1;
        } else if (newConsecutive === 2) {
          newInterval = 2;
        } else {
          newInterval = Math.round(previousInterval * 1.2);
        }
        newEase = Math.max(1.3, easeFactor - 0.15 + difficultyMod);
        break;

      case 'GOOD':
        newConsecutive = consecutiveSuccesses + 1;
        if (newConsecutive === 1) {
          newInterval = 1;
        } else if (newConsecutive === 2) {
          newInterval = 3;
        } else {
          newInterval = Math.round(previousInterval * easeFactor);
        }
        newEase = Math.max(1.3, easeFactor + difficultyMod);
        break;

      case 'EASY':
        newConsecutive = consecutiveSuccesses + 1;
        if (newConsecutive === 1) {
          newInterval = 2;
        } else if (newConsecutive === 2) {
          newInterval = 5;
        } else {
          newInterval = Math.round(previousInterval * easeFactor * 1.3);
        }
        newEase = Math.min(3.0, easeFactor + 0.15 + difficultyMod);
        break;

      default:
        newInterval = 1;
    }

    // Exam Proximity Override: Ensure revision occurs BEFORE test date
    if (examDaysLeft !== null && examDaysLeft > 0) {
      if (examDaysLeft <= 3) {
        newInterval = 1; // Force daily review when exam is within 3 days
      } else if (examDaysLeft <= 7) {
        newInterval = Math.min(newInterval, Math.max(1, Math.floor(examDaysLeft / 2)));
      } else if (newInterval >= examDaysLeft) {
        newInterval = Math.max(1, examDaysLeft - 1);
      }
    }

    // Compute next revision timestamp
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);
    nextDate.setHours(4, 0, 0, 0); // Schedule for early morning of target day

    return {
      nextRevisionDate: nextDate,
      intervalDays: newInterval,
      easeFactor: parseFloat(newEase.toFixed(2)),
      consecutiveSuccesses: newConsecutive
    };
  }
}

module.exports = RevisionEngine;
