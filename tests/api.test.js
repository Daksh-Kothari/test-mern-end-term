const assert = require('assert');
const RevisionEngine = require('../services/revisionEngine');
const MasteryEngine = require('../services/masteryEngine');
const PriorityEngine = require('../services/priorityEngine');
const WeakTopicEngine = require('../services/weakTopicEngine');
const StreakEngine = require('../services/streakEngine');
const GoalEngine = require('../services/goalEngine');

async function runTests() {
  console.log('====================================================');
  console.log('       RUNNING STUDYFLOW ALGORITHM & API TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`  [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${description}`);
      console.error(`         Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Revision Engine SM-2 Spaced Repetition Tests
  console.log('--- 1. Revision Engine SM-2 Spaced Repetition Tests ---');
  test('FORGOT rating resets consecutive successes to 0 and interval to 1 day', () => {
    const res = RevisionEngine.calculateNextRevision({
      recallRating: 'FORGOT',
      previousInterval: 7,
      easeFactor: 2.5,
      consecutiveSuccesses: 4
    });
    assert.strictEqual(res.consecutiveSuccesses, 0);
    assert.strictEqual(res.intervalDays, 1);
  });

  test('EASY rating increases interval and ease factor', () => {
    const res = RevisionEngine.calculateNextRevision({
      recallRating: 'EASY',
      previousInterval: 3,
      easeFactor: 2.5,
      consecutiveSuccesses: 2
    });
    assert.strictEqual(res.consecutiveSuccesses, 3);
    assert(res.intervalDays > 3, 'Interval should increase for EASY rating');
  });

  test('Exam proximity within 3 days forces daily review interval (1 day)', () => {
    const res = RevisionEngine.calculateNextRevision({
      recallRating: 'EASY',
      previousInterval: 14,
      consecutiveSuccesses: 5,
      examDaysLeft: 2
    });
    assert.strictEqual(res.intervalDays, 1, 'Exam within 3 days must override interval to 1');
  });

  // 2. Mastery Engine Tests
  console.log('\n--- 2. Mastery Engine Calculation Tests ---');
  test('New topic with no study sessions has 0 mastery and NOT_STARTED status', () => {
    const res = MasteryEngine.calculateMastery({ totalSessions: 0, revisionRecords: [] });
    assert.strictEqual(res.masteryScore, 0);
    assert.strictEqual(res.completionStatus, 'NOT_STARTED');
  });

  test('High recall history and consecutive successes calculate MASTERED status (80%+)', () => {
    const res = MasteryEngine.calculateMastery({
      revisionRecords: [{ recallRating: 'GOOD' }, { recallRating: 'EASY' }, { recallRating: 'EASY' }],
      consecutiveSuccesses: 4,
      totalSessions: 5
    });
    assert(res.masteryScore >= 80, `Mastery score ${res.masteryScore} should be >= 80`);
    assert.strictEqual(res.completionStatus, 'MASTERED');
  });

  // 3. Priority Engine Tests
  console.log('\n--- 3. Priority Engine Tests ---');
  test('Overdue topic with low mastery and critical importance yields CRITICAL priority', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days overdue

    const res = PriorityEngine.calculatePriority({
      nextRevisionDate: pastDate,
      masteryScore: 25,
      importance: 'CRITICAL',
      difficulty: 'HARD'
    });
    assert.strictEqual(res.priorityLevel, 'CRITICAL');
  });

  // 4. Weak Topic Detection Tests
  console.log('\n--- 4. Weak Topic Detection Tests ---');
  test('Topic with low mastery (30%) and FORGOT recall is identified as WEAK with reasons', () => {
    const topic = {
      title: 'Deadlocks',
      masteryScore: 30,
      importance: 'HIGH',
      nextRevisionDate: new Date(Date.now() - 86400000)
    };
    const records = [{ recallRating: 'FORGOT' }];

    const res = WeakTopicEngine.analyzeTopic(topic, records);
    assert.strictEqual(res.isWeak, true);
    assert(res.reasons.length > 0, 'Should generate human diagnostic reasons');
  });

  // 5. Streak Engine Tests
  console.log('\n--- 5. Streak Engine Tests ---');
  test('Consecutive daily study sessions compute active streak', () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const dayBefore = new Date(Date.now() - 86400000 * 2);

    const sessions = [
      { createdAt: today, durationMinutes: 30 },
      { createdAt: yesterday, durationMinutes: 45 },
      { createdAt: dayBefore, durationMinutes: 25 }
    ];

    const res = StreakEngine.calculateStreak(sessions);
    assert.strictEqual(res.currentStreak, 3);
    assert.strictEqual(res.isStreakActiveToday, true);
  });

  // 6. Goal Engine Tests
  console.log('\n--- 6. Goal Engine Tests ---');
  test('Goal evaluates completed status when target is reached', () => {
    const goal = {
      goalType: 'TOPICS_COMPLETED',
      targetValue: 2,
      currentValue: 0
    };
    const topics = [
      { completionStatus: 'MASTERED', masteryScore: 85 },
      { completionStatus: 'MASTERED', masteryScore: 90 }
    ];

    const res = GoalEngine.evaluateGoal(goal, { topics });
    assert.strictEqual(res.currentValue, 2);
    assert.strictEqual(res.progressPercentage, 100);
    assert.strictEqual(res.status, 'COMPLETED');
  });

  console.log('\n====================================================');
  console.log(`   TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
