import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Badge from '../components/ui/Badge';
import { History, Clock, BookOpen, Brain, Calendar, Plus } from 'lucide-react';

const StudySessions = ({ onOpenTimer }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/study-sessions');
      setSessions(res.data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load study sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const avgSessionLength = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Study History & Log</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete record of your deep focus blocks, revision intervals, and practice sessions.
          </p>
        </div>
        <button
          onClick={onOpenTimer}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 active:scale-95"
        >
          <Clock className="w-4 h-4" />
          <span>New Study Block</span>
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Study Hours
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-mono text-white">{totalHours}</span>
            <span className="text-xs text-slate-400">hours</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Completed Sessions
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-mono text-indigo-400">{sessions.length}</span>
            <span className="text-xs text-slate-400">blocks</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Average Session Duration
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">{avgSessionLength}</span>
            <span className="text-xs text-slate-400">minutes</span>
          </div>
        </div>
      </div>

      {/* Session Records Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Past Sessions</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{sessions.length} recorded</span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No study sessions logged yet. Click "New Study Block" to start your timer!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {sessions.map(session => {
              const sId = session._id || session.id;
              const dateObj = new Date(session.startTime || session.createdAt);

              return (
                <div
                  key={sId}
                  className="p-4 sm:p-5 hover:bg-slate-900/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-indigo-400">
                        {session.subject?.name || 'Subject'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="font-medium text-white text-sm">
                        {session.topic?.title || 'Topic'}
                      </span>
                    </div>

                    {session.notes && (
                      <p className="text-slate-400 text-xs italic">
                        "{session.notes}"
                      </p>
                    )}

                    <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {session.durationMinutes}m
                      </span>
                    </div>

                    <Badge type={session.sessionType} />
                    <Badge type={session.recallRating} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudySessions;
