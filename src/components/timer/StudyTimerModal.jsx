import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import api from '../../api/client';
import { Play, Pause, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';

const StudyTimerModal = ({ isOpen, onClose, onSessionSaved }) => {
  const [mode, setMode] = useState('stopwatch'); // 'stopwatch' | 'pomodoro'
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [sessionType, setSessionType] = useState('LEARNING');
  const [recallRating, setRecallRating] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch subjects when modal opens
  useEffect(() => {
    if (isOpen) {
      api.get('/subjects')
        .then(res => {
          setSubjects(res.data.subjects || []);
          if (res.data.subjects?.length > 0 && !selectedSubject) {
            setSelectedSubject(res.data.subjects[0]._id || res.data.subjects[0].id);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // Fetch topics when selectedSubject changes
  useEffect(() => {
    if (selectedSubject) {
      api.get(`/topics?subjectId=${selectedSubject}`)
        .then(res => {
          setTopics(res.data.topics || []);
          if (res.data.topics?.length > 0) {
            setSelectedTopic(res.data.topics[0]._id || res.data.topics[0].id);
          } else {
            setSelectedTopic('');
          }
        })
        .catch(err => console.error(err));
    } else {
      setTopics([]);
      setSelectedTopic('');
    }
  }, [selectedSubject]);

  // Timer tick effect
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          setElapsedSeconds(prev => prev + 1);
        } else {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsActive(false);
              return 0;
            }
            return prev - 1;
          });
          setElapsedSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, mode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setElapsedSeconds(0);
    setSecondsLeft(pomodoroMinutes * 60);
  };

  const handleModeChange = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    setElapsedSeconds(0);
    if (newMode === 'pomodoro') {
      setSecondsLeft(pomodoroMinutes * 60);
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishAndSave = async () => {
    if (!selectedTopic) {
      setError('Please select a subject and topic to log this study session.');
      return;
    }

    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    try {
      setLoading(true);
      setError('');
      const payload = {
        subjectId: selectedSubject,
        topicId: selectedTopic,
        durationMinutes: durationMins,
        sessionType,
        recallRating,
        notes
      };

      const res = await api.post('/study-sessions', payload);
      resetTimer();
      if (onSessionSaved) onSessionSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save study session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Academic Focus Session">
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Timer Mode Toggle */}
        <div className="flex justify-center">
          <div className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex space-x-1">
            <button
              onClick={() => handleModeChange('stopwatch')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'stopwatch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stopwatch
            </button>
            <button
              onClick={() => handleModeChange('pomodoro')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'pomodoro'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pomodoro
            </button>
          </div>
        </div>

        {/* Digital Clock Display */}
        <div className="text-center py-6 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="text-5xl sm:text-6xl font-bold font-mono text-white tracking-widest text-shadow mb-4">
            {mode === 'stopwatch' ? formatTime(elapsedSeconds) : formatTime(secondsLeft)}
          </div>

          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={toggleTimer}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all active:scale-95 ${
                isActive
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isActive ? 'Pause' : 'Start Focus'}</span>
            </button>

            <button
              onClick={resetTimer}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Topic & Session Selection Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
            >
              {subjects.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
            >
              {topics.length === 0 ? (
                <option value="">No topics in this subject</option>
              ) : (
                topics.map(t => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Session Type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
            >
              <option value="LEARNING">Deep Learning</option>
              <option value="REVISION">Spaced Revision</option>
              <option value="PRACTICE">Problem Solving / Practice</option>
              <option value="MOCK_TEST">Mock Test</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Recall Quality</label>
            <select
              value={recallRating}
              onChange={(e) => setRecallRating(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
            >
              <option value="GOOD">Good (Solid Comprehension)</option>
              <option value="EASY">Easy (Mastered Topic)</option>
              <option value="HARD">Hard (Struggled With Details)</option>
              <option value="FORGOT">Forgot (Needs Immediate Re-review)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Session Notes / Reflections (Optional)
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key concepts grasped, questions encountered..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          disabled={loading || elapsedSeconds < 5}
          onClick={handleFinishAndSave}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>Complete & Save Study Session</span>
        </button>
      </div>
    </Modal>
  );
};

export default StudyTimerModal;
