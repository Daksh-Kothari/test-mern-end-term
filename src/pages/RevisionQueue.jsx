import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import RevisionModal from '../components/revision/RevisionModal';
import { 
  RotateCcw, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Flame,
  Layers
} from 'lucide-react';

const RevisionQueue = () => {
  const [activeTab, setActiveTab] = useState('dueToday'); // 'dueToday' | 'overdue' | 'upcoming' | 'recommended'
  const [queue, setQueue] = useState({
    dueToday: [],
    overdue: [],
    upcoming: [],
    recommended: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Revision Modal State
  const [selectedTopicToRevise, setSelectedTopicToRevise] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/revisions/queue');
      setQueue(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch revision queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const getActiveList = () => {
    switch (activeTab) {
      case 'overdue':
        return queue.overdue || [];
      case 'upcoming':
        return queue.upcoming || [];
      case 'recommended':
        return queue.recommended || [];
      case 'dueToday':
      default:
        return queue.dueToday || [];
    }
  };

  const list = getActiveList();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
          <RotateCcw className="w-4 h-4" />
          <span>Spaced Repetition SM-2 Queue</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Revision Queue
        </h1>
        <p className="text-xs text-slate-400 max-w-xl">
          Review cards scheduled according to memory decay curves. Completing revisions on time prevents forgetting and locks concepts into permanent storage.
        </p>
      </div>

      {/* Queue Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('dueToday')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'dueToday'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Due Today</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white font-mono text-[10px]">
            {queue.dueToday?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white font-mono text-[10px]">
            {queue.overdue?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Next 7 Days</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white font-mono text-[10px]">
            {queue.upcoming?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('recommended')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'recommended'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recommended</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white font-mono text-[10px]">
            {queue.recommended?.length || 0}
          </span>
        </button>
      </div>

      {/* Queue Topic Cards */}
      {list.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-white">Queue Cleared!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'overdue'
              ? 'You have zero overdue revisions! Your academic memory retention is in great shape.'
              : 'No topics waiting in this queue. Check back tomorrow or review recommended concepts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map(topic => {
            const tId = topic._id || topic.id;
            const daysOverdue = topic.daysOverdue;

            return (
              <div
                key={tId}
                className="glass-panel rounded-2xl p-5 border border-slate-800/90 glass-panel-hover flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400">
                      {topic.subject?.name || 'Subject'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <Badge type={topic.difficulty} />
                      <Badge type={topic.importance} />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {topic.title}
                  </h3>

                  {topic.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <ProgressBar
                    value={topic.masteryScore || 0}
                    label="Current Retention Mastery"
                    size="sm"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-400">
                      {daysOverdue > 0 ? (
                        <span className="text-rose-400 font-semibold font-mono">
                          {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                        </span>
                      ) : topic.nextRevisionDate ? (
                        <span>
                          Due: <strong className="text-slate-300 font-mono">{new Date(topic.nextRevisionDate).toLocaleDateString()}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-500">Unscheduled</span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTopicToRevise(topic)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise Concept</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Spaced Revision Review Modal */}
      <RevisionModal
        isOpen={!!selectedTopicToRevise}
        topic={selectedTopicToRevise}
        onClose={() => setSelectedTopicToRevise(null)}
        onRevisionComplete={() => fetchQueue()}
      />
    </div>
  );
};

export default RevisionQueue;
