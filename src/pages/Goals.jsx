import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import { Target, Plus, CheckCircle, Clock, Trash2, Edit, AlertCircle, Award } from 'lucide-react';

const GOAL_TYPES = [
  { value: 'DAILY_STUDY_TIME', label: 'Daily Study Minutes' },
  { value: 'WEEKLY_STUDY_TIME', label: 'Weekly Study Minutes' },
  { value: 'TOPICS_COMPLETED', label: 'Topics Mastered' },
  { value: 'REVISIONS_COMPLETED', label: 'Revisions Completed' }
];

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('DAILY_STUDY_TIME');
  const [targetValue, setTargetValue] = useState(60);
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/goals');
      setGoals(res.data.goals || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch study goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setGoalType('DAILY_STUDY_TIME');
    setTargetValue(60);
    setEndDate('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setGoalType(goal.goalType);
    setTargetValue(goal.targetValue);
    setEndDate(goal.endDate ? goal.endDate.split('T')[0] : '');
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals(prev => prev.filter(g => (g._id !== goalId && g.id !== goalId)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete goal');
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!title.trim() || Number(targetValue) <= 0) return;

    try {
      setSaving(true);
      setError('');
      const payload = {
        title: title.trim(),
        goalType,
        targetValue: Number(targetValue),
        endDate: endDate ? new Date(endDate) : null
      };

      if (editingGoal) {
        const id = editingGoal._id || editingGoal.id;
        await api.patch(`/goals/${id}`, payload);
      } else {
        await api.post('/goals', payload);
      }

      setIsModalOpen(false);
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const formatUnit = (type) => {
    if (type.includes('TIME')) return 'mins';
    if (type.includes('TOPIC')) return 'topics';
    return 'reviews';
  };

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Goals</h1>
          <p className="text-xs text-slate-400 mt-1">
            Establish study velocity targets and let the engine verify daily progress automatically.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8 space-y-3">
          <Target className="w-12 h-12 text-indigo-400 mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-white">No Active Goals</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Set targets like 90 minutes of daily study or completing 5 revisions to build study habits.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map(goal => {
            const gId = goal._id || goal.id;
            const isCompleted = goal.status === 'COMPLETED' || (goal.progressPercentage || 0) >= 100;

            return (
              <div
                key={gId}
                className={`glass-panel rounded-2xl p-6 border transition-all flex flex-col justify-between space-y-4 ${
                  isCompleted ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800/90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                        {goal.goalType?.replace(/_/g, ' ')}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {goal.title}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                      }`}
                    >
                      {isCompleted ? 'Goal Achieved' : 'In Progress'}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2 text-slate-300 text-xs">
                    <span className="text-2xl font-bold font-mono text-white">
                      {goal.currentValue || 0}
                    </span>
                    <span className="text-slate-500 font-mono">/ {goal.targetValue} {formatUnit(goal.goalType)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <ProgressBar
                    value={goal.progressPercentage || 0}
                    label="Completion Progress"
                    size="sm"
                  />

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>
                      {goal.endDate ? `Deadline: ${new Date(goal.endDate).toLocaleDateString()}` : 'Continuous Goal'}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Goal"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(gId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Edit Study Goal' : 'Create New Study Goal'}
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Study 90 minutes each day before finals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Goal Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {GOAL_TYPES.map(gt => (
                  <option key={gt.value} value={gt.value}>{gt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Value ({formatUnit(goalType)}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Deadline (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Goals;
