import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import { 
  Plus, 
  BookOpen, 
  Calendar, 
  Layers, 
  MoreVertical, 
  Trash2, 
  Edit, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444'  // Rose
];

const Subjects = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subjects');
      setSubjects(res.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setColor('#6366F1');
    setExamDate('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub, e) => {
    e.stopPropagation();
    setEditingSubject(sub);
    setName(sub.name);
    setDescription(sub.description || '');
    setColor(sub.color || '#6366F1');
    setExamDate(sub.examDate ? sub.examDate.split('T')[0] : '');
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (subId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this subject? All associated topics will remain accessible or archived.')) {
      return;
    }
    try {
      await api.delete(`/subjects/${subId}`);
      setSubjects(prev => prev.filter(s => (s._id !== subId && s.id !== subId)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError('');
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color,
        examDate: examDate ? new Date(examDate) : null
      };

      if (editingSubject) {
        const id = editingSubject._id || editingSubject.id;
        await api.patch(`/subjects/${id}`, payload);
      } else {
        await api.post('/subjects', payload);
      }

      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Subjects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize curricula, track topic mastery distributions, and prepare for upcoming exams.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white mb-1">No Subjects Registered</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            Add your course subjects such as Data Structures, Operating Systems, or Physics to start structuring topics.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Your First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map(subject => {
            const subId = subject._id || subject.id;
            return (
              <div
                key={subId}
                onClick={() => navigate(`/subjects/${subId}`)}
                className="group relative glass-panel rounded-2xl p-6 border border-slate-800/90 glass-panel-hover cursor-pointer flex flex-col justify-between"
              >
                {/* Subject Accent Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
                  style={{ backgroundColor: subject.color || '#6366F1' }}
                />

                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: `${subject.color || '#6366F1'}30`, border: `1px solid ${subject.color || '#6366F1'}60` }}
                      >
                        <BookOpen className="w-4 h-4" style={{ color: subject.color || '#6366F1' }} />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {subject.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => handleOpenEditModal(subject, e)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Subject"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSubject(subId, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {subject.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {subject.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4 pt-4 mt-4 border-t border-slate-800/80">
                  <ProgressBar
                    value={subject.averageMastery || 0}
                    label="Proficiency"
                    size="sm"
                  />

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <div className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{subject.totalTopics || 0} topics</span>
                    </div>

                    {subject.examDate ? (
                      <div className="flex items-center space-x-1 text-amber-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Exam: {new Date(subject.examDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Explore</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Create New Subject'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Syllabus Overview
            </label>
            <textarea
              rows="2"
              placeholder="Core focus areas, textbooks, references..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center space-x-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Final / Term Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
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
              {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Subjects;
