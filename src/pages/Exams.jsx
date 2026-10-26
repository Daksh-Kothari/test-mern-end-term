import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { Calendar, Plus, AlertCircle, Trash2, Edit, AlertTriangle, BookOpen, Clock } from 'lucide-react';

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [importance, setImportance] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExamsAndSubjects = async () => {
    try {
      setLoading(true);
      const [examsRes, subjectsRes] = await Promise.all([
        api.get('/exams'),
        api.get('/subjects')
      ]);
      setExams(examsRes.data.exams || []);
      setSubjects(subjectsRes.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exam data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndSubjects();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setSubjectId(subjects[0]?._id || subjects[0]?.id || '');
    setName('');
    setDate('');
    setImportance('HIGH');
    setDescription('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exam) => {
    setEditingExam(exam);
    setSubjectId(exam.subject?._id || exam.subject?.id || exam.subject || '');
    setName(exam.name);
    setDate(exam.date ? exam.date.split('T')[0] : '');
    setImportance(exam.importance || 'HIGH');
    setDescription(exam.description || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam from your academic calendar?')) return;
    try {
      await api.delete(`/exams/${examId}`);
      setExams(prev => prev.filter(e => (e._id !== examId && e.id !== examId)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subjectId || !date) return;

    try {
      setSaving(true);
      setError('');
      const payload = {
        subjectId,
        name: name.trim(),
        date: new Date(date),
        importance,
        description: description.trim()
      };

      if (editingExam) {
        const id = editingExam._id || editingExam.id;
        await api.patch(`/exams/${id}`, payload);
      } else {
        await api.post('/exams', payload);
      }

      setIsModalOpen(false);
      fetchExamsAndSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Exam Countdown & Readiness</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track upcoming midterms, finals, and tests with live topic mastery & retention indicators.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Exam</span>
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8 space-y-3">
          <Calendar className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-white">No Scheduled Exams</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Schedule your upcoming tests to unlock automated priority scoring and alert thresholds.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Add Your First Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map(exam => {
            const eId = exam._id || exam.id;
            const daysRemaining = exam.daysRemaining;

            return (
              <div
                key={eId}
                className="glass-panel rounded-2xl p-6 border border-slate-800/90 glass-panel-hover flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-indigo-400 block mb-1">
                        {exam.subject?.name || 'Subject'}
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        {exam.name}
                      </h3>
                    </div>
                    <Badge type={exam.importance} />
                  </div>

                  {exam.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-300 font-medium">
                        {new Date(exam.date).toLocaleDateString()}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        daysRemaining <= 7
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {daysRemaining === 0 ? 'Exam Today!' : `${daysRemaining} days left`}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <ProgressBar
                    value={exam.subjectMastery || 0}
                    label="Subject Readiness Score"
                    size="sm"
                  />

                  {exam.weakTopicsCount > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{exam.weakTopicsCount} weak topic(s) need reinforcement</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-1 pt-1">
                    <button
                      onClick={() => handleOpenEditModal(exam)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Edit Exam"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(eId)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Exam' : 'Schedule New Exam'}
      >
        <form onSubmit={handleSaveExam} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {subjects.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Exam Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. End-Term Algorithms Theory Examination"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Exam Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Importance Level
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High (Major Exam)</option>
                <option value="CRITICAL">Critical (Final / Board)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Topics Covered (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Chapters 1-5, Graph algorithms, dynamic programming..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
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
              {saving ? 'Saving...' : editingExam ? 'Update Exam' : 'Schedule Exam'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Exams;
