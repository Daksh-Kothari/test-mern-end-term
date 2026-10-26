import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import RevisionModal from '../components/revision/RevisionModal';
import { 
  Flame, 
  Clock, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Sparkles,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';

const Dashboard = ({ onOpenTimer }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Revision modal state
  const [selectedTopicToRevise, setSelectedTopicToRevise] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading Academic Analytics...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const weakTopics = data?.weakTopics || [];
  const weakestSubjects = data?.weakestSubjects || [];
  const upcomingExams = data?.upcomingExams || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Study Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Scholar'}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Track your revision intervals, conquer weak topics with spaced repetition, and hit exam day fully prepared.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/revisions')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all flex items-center space-x-2 shadow-sm"
            >
              <span>Revision Queue</span>
              {metrics.revisionsDueToday > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-xs font-mono font-bold">
                  {metrics.revisionsDueToday}
                </span>
              )}
            </button>
            <button
              onClick={onOpenTimer}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Start Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Metric */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 glass-panel-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Study Streak
            </span>
            <div className={`p-2 rounded-xl ${metrics.isStreakActiveToday ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <Flame className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.currentStreak || 0}
            </span>
            <span className="text-xs text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Longest: <span className="text-amber-400 font-semibold">{metrics.longestStreak || 0} days</span>
          </p>
        </div>

        {/* Today's Study Time */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 glass-panel-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Focus
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.todayMinutes || 0}
            </span>
            <span className="text-xs text-slate-400">minutes</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Weekly: <span className="text-indigo-400 font-semibold">{Math.round((metrics.weeklyMinutes || 0) / 60 * 10) / 10} hrs</span>
          </p>
        </div>

        {/* Topic Mastery */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 glass-panel-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Mastery Score
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.averageMastery || 0}%
            </span>
            <span className="text-xs text-slate-400">average</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Mastered: <span className="text-emerald-400 font-semibold">{metrics.completedTopics || 0}/{metrics.totalTopics || 0} topics</span>
          </p>
        </div>

        {/* Revisions Due */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 glass-panel-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Revisions Due
            </span>
            <div className={`p-2 rounded-xl ${metrics.revisionsOverdue > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.revisionsDueToday || 0}
            </span>
            <span className="text-xs text-slate-400">ready</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Overdue: <span className="text-rose-400 font-semibold">{metrics.revisionsOverdue || 0} topics</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Weak Topics & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagnostic Weak Topics Section (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Diagnostic Weak Topic Engine</span>
                <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">
                  {weakTopics.length} flagged
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Topics requiring immediate memory reinforcement prior to exams
              </p>
            </div>
            <button
              onClick={() => navigate('/revisions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {weakTopics.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              All topics currently meet healthy memory retention thresholds!
            </div>
          ) : (
            <div className="space-y-3">
              {weakTopics.slice(0, 5).map(({ topic, reasons, weakScore }) => (
                <div
                  key={topic._id || topic.id}
                  className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-indigo-400">
                        {topic.subject?.name || 'Subject'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <Badge type={topic.difficulty} />
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      {topic.title}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block">Mastery</span>
                      <span className="text-sm font-bold font-mono text-rose-400">
                        {topic.masteryScore || 0}%
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTopicToRevise(topic)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                    >
                      Revise Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Upcoming Exams & Subject Mastery */}
        <div className="space-y-6">
          {/* Upcoming Exams Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Upcoming Exams</span>
              </h3>
              <button
                onClick={() => navigate('/exams')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Plan Exams
              </button>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No upcoming exams scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map(exam => (
                  <div
                    key={exam._id || exam.id}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{exam.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(exam.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                        exam.daysRemaining <= 7
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {exam.daysRemaining === 0 ? 'Today' : `${exam.daysRemaining}d left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject Mastery Overview */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Subject Proficiency</span>
              </h3>
              <button
                onClick={() => navigate('/subjects')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View Subjects
              </button>
            </div>

            {weakestSubjects.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No subjects registered yet.
              </p>
            ) : (
              <div className="space-y-3">
                {weakestSubjects.map(({ subject, topicCount, averageMastery }) => (
                  <div key={subject._id || subject.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-200">
                        {subject.name}
                      </span>
                      <span className="font-mono text-slate-400">
                        {averageMastery}% ({topicCount} topics)
                      </span>
                    </div>
                    <ProgressBar value={averageMastery} showValue={false} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revision Modal for Instant Recall Review */}
      <RevisionModal
        isOpen={!!selectedTopicToRevise}
        topic={selectedTopicToRevise}
        onClose={() => setSelectedTopicToRevise(null)}
        onRevisionComplete={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default Dashboard;
