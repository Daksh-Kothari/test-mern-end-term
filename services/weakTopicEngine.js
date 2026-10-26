/**
 * StudyFlow Deterministic Weak-Topic Detection Engine
 */
class WeakTopicEngine {
  /**
   * Evaluates topic performance & scheduling parameters to identify weak topics.
   * Generates explainable human diagnostic reasons for students.
   * 
   * @param {Object} topic - Topic document
   * @param {Array} revisionRecords - History of reviews for this topic
   * @param {Object|null} subject - Associated subject
   * @returns {Object} { isWeak, reasons, weakScore }
   */
  static analyzeTopic(topic, revisionRecords = [], subject = null) {
    const reasons = [];
    let weakPoints = 0;

    const mastery = topic.masteryScore || 0;
    const importance = (topic.importance || 'MEDIUM').toUpperCase();
    const difficulty = (topic.difficulty || 'MEDIUM').toUpperCase();

    // 1. Low Mastery Check
    if (mastery < 40) {
      reasons.push(`Critical Mastery deficit (${mastery}%)`);
      weakPoints += 40;
    } else if (mastery < 60) {
      reasons.push(`Sub-optimal Mastery score (${mastery}%)`);
      weakPoints += 25;
    }

    // 2. Recent Recall Performance Check
    if (revisionRecords.length > 0) {
      const lastReview = revisionRecords[revisionRecords.length - 1];
      const lastRating = lastReview.recallRating ? lastReview.recallRating.toUpperCase() : 'GOOD';
      if (lastRating === 'FORGOT') {
        reasons.push('Failed last recall attempt (FORGOT)');
        weakPoints += 30;
      } else if (lastRating === 'HARD') {
        reasons.push('Struggled during last recall (HARD)');
        weakPoints += 15;
      }
    }

    // 3. Overdue Revision Check
    const now = new Date();
    if (topic.nextRevisionDate && new Date(topic.nextRevisionDate) < now) {
      const daysOverdue = Math.floor((now - new Date(topic.nextRevisionDate)) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= 1) {
        reasons.push(`Revision overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`);
        weakPoints += Math.min(25, daysOverdue * 5);
      }
    }

    // 4. High Importance / High Difficulty Risk Penalty
    if ((importance === 'CRITICAL' || importance === 'HIGH') && mastery < 75) {
      reasons.push(`High exam importance (${importance}) with un-mastered content`);
      weakPoints += 20;
    }

    if ((difficulty === 'VERY_HARD' || difficulty === 'HARD') && mastery < 70) {
      reasons.push(`High topic difficulty (${difficulty}) needing frequent revision`);
      weakPoints += 15;
    }

    // 5. Exam Proximity Danger
    if (subject && subject.examDate) {
      const examDaysLeft = Math.floor((new Date(subject.examDate) - now) / (1000 * 60 * 60 * 24));
      if (examDaysLeft >= 0 && examDaysLeft <= 14 && mastery < 70) {
        reasons.push(`Exam approaching in ${examDaysLeft} day${examDaysLeft === 1 ? '' : 's'} with mastery under 70%`);
        weakPoints += 25;
      }
    }

    const isWeak = weakPoints >= 30;

    return {
      isWeak,
      reasons,
      weakScore: weakPoints
    };
  }
}

module.exports = WeakTopicEngine;
