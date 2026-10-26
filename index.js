const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const topicRoutes = require('./routes/topicRoutes');
const studySessionRoutes = require('./routes/studySessionRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const examRoutes = require('./routes/examRoutes');
const goalRoutes = require('./routes/goalRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const noteRoutes = require('./routes/noteRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in development
    }
  },
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notes', noteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyFlow Academic Engine operational', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[StudyFlow Server Error]:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  StudyFlow Backend Server running on port ${PORT}`);
  console.log(`  API Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

module.exports = app;
