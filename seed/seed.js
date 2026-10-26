const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('../config/db');
const { UserRepository } = require('../models/User');
const { SubjectRepository } = require('../models/Subject');
const { TopicRepository } = require('../models/Topic');
const { StudySessionRepository } = require('../models/StudySession');
const { RevisionRecordRepository } = require('../models/RevisionRecord');
const { ExamRepository } = require('../models/Exam');
const { StudyGoalRepository } = require('../models/StudyGoal');
const { NotificationRepository } = require('../models/Notification');
const { NoteRepository } = require('../models/Note');
const { ActivityRepository } = require('../models/Activity');

const seedData = async () => {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  console.log('[Seed] Seeding StudyFlow database with academic data...');

  // 1. Create Demo Student Account
  let student = await UserRepository.findByEmail('student@studyflow.com');
  if (!student) {
    student = await UserRepository.create({
      name: 'Alex Rivera',
      email: 'student@studyflow.com',
      password: 'password123',
      role: 'user',
      dailyStudyGoalMinutes: 90
    });
    console.log('[Seed] Created demo user: student@studyflow.com');
  }

  const userId = student._id || student.id;

  // 2. Create Realistic Academic Subjects
  const subjectsData = [
    {
      name: 'Data Structures & Algorithms',
      description: 'Core fundamental algorithms, tree structures, graph traversals, and dynamic programming.',
      color: '#6366F1', // Indigo
      icon: 'Binary',
      examDate: new Date(Date.now() + 14 * 86400000) // 14 days from now
    },
    {
      name: 'Operating Systems',
      description: 'Process management, concurrency, virtual memory management, and file systems.',
      color: '#8B5CF6', // Purple
      icon: 'Cpu',
      examDate: new Date(Date.now() + 21 * 86400000) // 21 days from now
    },
    {
      name: 'Database Management Systems',
      description: 'Relational algebra, SQL query optimization, ACID transactions, and index structures.',
      color: '#06B6D4', // Cyan
      icon: 'Database',
      examDate: new Date(Date.now() + 7 * 86400000) // 7 days from now
    },
    {
      name: 'Computer Networks',
      description: 'OSI 7-layer model, TCP/IP congestion control, routing protocols, and HTTP/3.',
      color: '#10B981', // Emerald
      icon: 'Network',
      examDate: new Date(Date.now() + 30 * 86400000) // 30 days from now
    }
  ];

  const createdSubjects = [];
  for (const sData of subjectsData) {
    const existingSubs = await SubjectRepository.findByUser(userId);
    let sub = existingSubs.find(s => s.name === sData.name);
    if (!sub) {
      sub = await SubjectRepository.create({ ...sData, user: userId });
    }
    createdSubjects.push(sub);
  }

  const dsa = createdSubjects[0]._id || createdSubjects[0].id;
  const os = createdSubjects[1]._id || createdSubjects[1].id;
  const dbms = createdSubjects[2]._id || createdSubjects[2].id;
  const cn = createdSubjects[3]._id || createdSubjects[3].id;

  // 3. Create Topics across subjects
  const topicsData = [
    // DSA
    {
      subject: dsa,
      title: 'AVL & Red-Black Tree Rotations',
      description: 'Self-balancing binary search trees, single and double rotations, balance factors.',
      difficulty: 'HARD',
      importance: 'HIGH',
      completionStatus: 'LEARNING',
      masteryScore: 42,
      consecutiveSuccesses: 1,
      nextRevisionDate: new Date(Date.now() - 2 * 86400000) // OVERDUE by 2 days
    },
    {
      subject: dsa,
      title: 'Dijkstra & A* Shortest Path Algorithms',
      description: 'Graph priority queue implementation, edge relaxation, heuristic selection.',
      difficulty: 'VERY_HARD',
      importance: 'CRITICAL',
      completionStatus: 'REVIEWING',
      masteryScore: 68,
      consecutiveSuccesses: 3,
      nextRevisionDate: new Date(Date.now() + 1 * 86400000) // Due tomorrow
    },
    {
      subject: dsa,
      title: 'Array Hash Tables & Open Addressing',
      description: 'Collision resolution strategies, linear probing, quadratic probing, hash functions.',
      difficulty: 'MEDIUM',
      importance: 'HIGH',
      completionStatus: 'MASTERED',
      masteryScore: 92,
      consecutiveSuccesses: 5,
      nextRevisionDate: new Date(Date.now() + 6 * 86400000)
    },

    // Operating Systems
    {
      subject: os,
      title: 'Process Scheduling Algorithms (Round Robin & Priority)',
      description: 'Preemptive vs non-preemptive scheduling, context switching overhead, Gantt charts.',
      difficulty: 'MEDIUM',
      importance: 'CRITICAL',
      completionStatus: 'LEARNING',
      masteryScore: 35,
      consecutiveSuccesses: 0,
      nextRevisionDate: new Date(Date.now() - 1 * 86400000) // OVERDUE by 1 day
    },
    {
      subject: os,
      title: 'Virtual Memory & Page Replacement (LRU, FIFO)',
      description: 'Paging mechanisms, Translation Lookaside Buffer (TLB), page fault rate analysis.',
      difficulty: 'HARD',
      importance: 'HIGH',
      completionStatus: 'REVIEWING',
      masteryScore: 58,
      consecutiveSuccesses: 2,
      nextRevisionDate: new Date(Date.now()) // Due today
    },
    {
      subject: os,
      title: 'Deadlock Detection & Banker Algorithm',
      description: 'Coffman 4 conditions, resource allocation graph, safety state checking.',
      difficulty: 'VERY_HARD',
      importance: 'CRITICAL',
      completionStatus: 'LEARNING',
      masteryScore: 28,
      consecutiveSuccesses: 0,
      nextRevisionDate: new Date(Date.now() - 3 * 86400000) // OVERDUE by 3 days
    },

    // DBMS
    {
      subject: dbms,
      title: 'B+ Tree Indexing & Search Complexity',
      description: 'Multilevel index structures, node splitting, range queries, leaf pointers.',
      difficulty: 'HARD',
      importance: 'HIGH',
      completionStatus: 'REVIEWING',
      masteryScore: 74,
      consecutiveSuccesses: 3,
      nextRevisionDate: new Date(Date.now() + 2 * 86400000)
    },
    {
      subject: dbms,
      title: 'ACID Properties & Two-Phase Locking (2PL)',
      description: 'Transaction isolation levels, phantom reads, shared/exclusive locks.',
      difficulty: 'MEDIUM',
      importance: 'CRITICAL',
      completionStatus: 'MASTERED',
      masteryScore: 88,
      consecutiveSuccesses: 4,
      nextRevisionDate: new Date(Date.now() + 5 * 86400000)
    },

    // Computer Networks
    {
      subject: cn,
      title: 'TCP 3-Way Handshake & Flow Control',
      description: 'SYN, ACK, FIN packets, sliding window protocol, sequence numbers.',
      difficulty: 'MEDIUM',
      importance: 'HIGH',
      completionStatus: 'MASTERED',
      masteryScore: 85,
      consecutiveSuccesses: 4,
      nextRevisionDate: new Date(Date.now() + 4 * 86400000)
    }
  ];

  const createdTopics = [];
  const existingTopics = await TopicRepository.findByUser(userId);
  for (const tData of topicsData) {
    let top = existingTopics.find(t => t.title === tData.title);
    if (!top) {
      top = await TopicRepository.create({ ...tData, user: userId });
    }
    createdTopics.push(top);
  }

  // 4. Create Historical Study Sessions
  const sessionsData = [
    {
      subject: os,
      topic: createdTopics[3]._id || createdTopics[3].id, // Process Scheduling
      startTime: new Date(Date.now() - 86400000 * 2),
      endTime: new Date(Date.now() - 86400000 * 2 + 45 * 60000),
      durationMinutes: 45,
      sessionType: 'LEARNING',
      notes: 'Reviewed Gantt charts for round robin and process state transitions.',
      recallRating: 'HARD'
    },
    {
      subject: dsa,
      topic: createdTopics[0]._id || createdTopics[0].id, // AVL Trees
      startTime: new Date(Date.now() - 86400000 * 1),
      endTime: new Date(Date.now() - 86400000 * 1 + 50 * 60000),
      durationMinutes: 50,
      sessionType: 'REVISION',
      notes: 'Practiced double rotation cases (Left-Right and Right-Left).',
      recallRating: 'GOOD'
    },
    {
      subject: dbms,
      topic: createdTopics[7]._id || createdTopics[7].id, // ACID Properties
      startTime: new Date(Date.now() - 120 * 60000),
      endTime: new Date(Date.now() - 60 * 60000),
      durationMinutes: 60,
      sessionType: 'PRACTICE',
      notes: 'Solved 15 questions on Two-Phase Locking strict vs rigorous.',
      recallRating: 'EASY'
    }
  ];

  for (const sData of sessionsData) {
    const existingSess = await StudySessionRepository.findByUser(userId);
    if (existingSess.length < 3) {
      await StudySessionRepository.create({ ...sData, user: userId });
    }
  }

  // 5. Create Exams
  const examsData = [
    {
      subject: dbms,
      name: 'DBMS Mid-Term Examination',
      date: new Date(Date.now() + 7 * 86400000),
      description: 'Covers Relational Algebra, SQL, Normalization, and Indexing.',
      importance: 'CRITICAL'
    },
    {
      subject: dsa,
      name: 'DSA Comprehensive Evaluation',
      date: new Date(Date.now() + 14 * 86400000),
      description: 'Covers Trees, Graphs, Sorting, Dynamic Programming.',
      importance: 'HIGH'
    },
    {
      subject: os,
      name: 'Operating Systems End-Term Exam',
      date: new Date(Date.now() + 21 * 86400000),
      description: 'Covers Process Sync, Deadlocks, Virtual Memory, File Systems.',
      importance: 'CRITICAL'
    }
  ];

  const existingExams = await ExamRepository.findByUser(userId);
  for (const eData of examsData) {
    if (!existingExams.some(e => e.name === eData.name)) {
      await ExamRepository.create({ ...eData, user: userId });
    }
  }

  // 6. Create Study Goals
  const goalsData = [
    {
      title: 'Daily 90-Minute Focus Study Goal',
      goalType: 'DAILY_STUDY_TIME',
      targetValue: 90,
      currentValue: 60,
      status: 'ACTIVE'
    },
    {
      title: 'Master 5 Core Computer Science Topics',
      goalType: 'TOPICS_COMPLETED',
      targetValue: 5,
      currentValue: 3,
      status: 'ACTIVE'
    },
    {
      title: 'Complete 10 Spaced Repetition Revisions',
      goalType: 'REVISIONS_COMPLETED',
      targetValue: 10,
      currentValue: 6,
      status: 'ACTIVE'
    }
  ];

  const existingGoals = await StudyGoalRepository.findByUser(userId);
  for (const gData of goalsData) {
    if (!existingGoals.some(g => g.title === gData.title)) {
      await StudyGoalRepository.create({ ...gData, user: userId });
    }
  }

  // 7. Create Activity Timeline
  await ActivityRepository.log({
    userId,
    action: 'SUBJECT_CREATED',
    details: { subjectName: 'Data Structures & Algorithms' }
  });
  await ActivityRepository.log({
    userId,
    action: 'STUDY_SESSION_COMPLETED',
    details: { topicTitle: 'Process Scheduling Algorithms', durationMinutes: 45, recallRating: 'HARD' }
  });
  await ActivityRepository.log({
    userId,
    action: 'REVISION_COMPLETED',
    details: { topicTitle: 'ACID Properties & Two-Phase Locking', recallRating: 'EASY', newMastery: 88 }
  });

  console.log('[Seed] Database successfully populated!');
  console.log('----------------------------------------------------');
  console.log('DEMO STUDENT CREDENTIALS FOR EVALUATION:');
  console.log('Email:    student@studyflow.com');
  console.log('Password: password123');
  console.log('----------------------------------------------------');
};

if (require.main === module) {
  seedData().then(() => process.exit(0)).catch(err => {
    console.error('Seed Error:', err);
    process.exit(1);
  });
}

module.exports = seedData;
