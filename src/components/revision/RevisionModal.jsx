import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import api from '../../api/client';
import { Brain, CheckCircle2, AlertCircle, Sparkles, Clock } from 'lucide-react';

const RevisionModal = ({ isOpen, onClose, topic, onRevisionComplete }) => {
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!topic) return null;

  const handleRatingSubmit = async (recallRating) => {
    try {
      setLoading(true);
      setError('');
      const topicId = topic._id || topic.id;
      const res = await api.post(`/revisions/${topicId}/complete`, {
        recallRating,
        durationMinutes: Number(durationMinutes) || 15,
        notes
      });

      setResult(res.data);
      if (onRevisionComplete) {
        onRevisionComplete(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit revision');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Complete Spaced Revision">
      {result ? (
        <div className="py-4 text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-white mb-1">Revision Recorded!</h4>
            <p className="text-sm text-slate-300">
              {result.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-left text-xs">
            <div>
              <span className="text-slate-400 block mb-1">New Mastery Score</span>
              <span className="text-lg font-bold text-indigo-400 font-mono">
                {result.masteryResult?.masteryScore ?? result.topic?.masteryScore}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Next Revision In</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {result.revisionResult?.intervalDays || 1} day(s)
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
          >
            Continue Studying
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Topic Header Card */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-indigo-400 block mb-1">
                  {topic.subject?.name || 'Subject'}
                </span>
                <h4 className="text-base font-bold text-white leading-snug">
                  {topic.title}
                </h4>
              </div>
              <Badge type={topic.difficulty} />
            </div>

            {topic.description && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {topic.description}
              </p>
            )}

            <div className="pt-2 border-t border-slate-800/80">
              <ProgressBar
                value={topic.masteryScore || 0}
                label="Current Topic Mastery"
                size="sm"
              />
            </div>
          </div>

          {/* Duration & Notes Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Time Spent (mins)</span>
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quick Revision Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Key formulas, concepts recalled..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Recall Rating Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
              How accurately did you recall this concept?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                disabled={loading}
                onClick={() => handleRatingSubmit('FORGOT')}
                className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-center transition-all disabled:opacity-50 hover:scale-[1.02]"
              >
                <div className="text-xs font-bold mb-0.5">FORGOT</div>
                <div className="text-[10px] text-rose-400/80">Blackout / Reset</div>
              </button>

              <button
                disabled={loading}
                onClick={() => handleRatingSubmit('HARD')}
                className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-center transition-all disabled:opacity-50 hover:scale-[1.02]"
              >
                <div className="text-xs font-bold mb-0.5">HARD</div>
                <div className="text-[10px] text-amber-400/80">Recalled with struggle</div>
              </button>

              <button
                disabled={loading}
                onClick={() => handleRatingSubmit('GOOD')}
                className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-center transition-all disabled:opacity-50 hover:scale-[1.02]"
              >
                <div className="text-xs font-bold mb-0.5">GOOD</div>
                <div className="text-[10px] text-indigo-400/80">Correct with hesitation</div>
              </button>

              <button
                disabled={loading}
                onClick={() => handleRatingSubmit('EASY')}
                className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-center transition-all disabled:opacity-50 hover:scale-[1.02]"
              >
                <div className="text-xs font-bold mb-0.5">EASY</div>
                <div className="text-[10px] text-emerald-400/80">Instant recall / Solid</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RevisionModal;
