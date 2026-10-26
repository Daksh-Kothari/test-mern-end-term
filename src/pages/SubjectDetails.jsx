import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import RevisionModal from '../components/revision/RevisionModal';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const SubjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [importanceFilter, setImportanceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add / Edit Topic Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [importance, setImportance] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);

  // Revision Modal
  const [selectedTopicToRevise, setSelectedTopicToRevise] = useState(null);

  const fetchSubjectAndTopics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/subjects/${id}`);
      setSubject(res.data.subject);
      setTopics(res.data.topics || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch subject details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectAndTopics();
  }, [id]);

  const handleOpenAddModal = () => {
    setEditingTopic(null);
    setTitle('');
    setDescription('');
    setDifficulty('MEDIUM');
    setImportance('MEDIUM');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t) => {
    setEditingTopic(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setDifficulty(t.difficulty || 'MEDIUM');
    setImportance(t.importance || 'MEDIUM');
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError('');

      if (editingTopic) {
        const tId = editingTopic._id || editingTopic.id;
        await api.patch(`/topics/${tId}`, {
          title: title.trim(),
          description: description.trim(),
          difficulty,
          importance
        });
      } else {
        await api.post('/topics', {
          subjectId: id,
          title: title.trim(),
          description: description.trim(),
          difficulty,
          importance
        });
      }

      setIsModalOpen(false);
      fetchSubjectAndTopics();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (tId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;
    try {
      await api.delete(`/topics/${tId}`);
      setTopics(prev => prev.filter(t => (t._id !== tId && t.id !== tId)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete topic');
    }
  };

  // Filtered topics
  const filteredTopics = topics.filter(t => {
    const matchesSearch = !search || 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = !difficultyFilter || t.difficulty === difficultyFilter;
    const matchesImportance = !importanceFilter || t.importance === importanceFilter;
    const matchesStatus = !statusFilter || t.completionStatus === statusFilter;
    return matchesSearch && matchesDifficulty && matchesImportance && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-20 text-slate-400">
        Subject not found.
      </div>
    );
  }

  const totalTopics = topics.length;
  const masteredCount = topics.filter(t => t.completionStatus === 'MASTERED' || (t.masteryScore || 0) >= 80).length;
  const avgMastery = totalTopics > 0 ? Math.round(topics.reduce((s, t) => s + (t.masteryScore || 0), 0) / totalTopics) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/subjects')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subjects</span>
        </button>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Topic</span>
        </button>
      </div>

      {/* Subject Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subject.color || '#6366F1' }}
              />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Curriculum Focus
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {subject.name}
            </h1>
            {subject.description && (
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {subject.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Overall Mastery</span>
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {avgMastery}%
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Mastered</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {masteredCount}/{totalTopics}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topics by title or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="VERY_HARD">Very Hard</option>
          </select>

          <select
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="LEARNING">Learning</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="MASTERED">Mastered</option>
          </select>
        </div>
      </div>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-3xl border border-slate-800 p-8">
          <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No topics found</p>
          <p className="text-xs text-slate-500 mt-1">
            {search || difficultyFilter || importanceFilter || statusFilter
              ? 'Try resetting the search filters.'
              : 'Add topics to track specific formulas, theorems, and concepts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map(topic => {
            const tId = topic._id || topic.id;
            const isOverdue = topic.nextRevisionDate && new Date(topic.nextRevisionDate) < new Date();

            return (
              <div
                key={tId}
                className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/90 glass-panel-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge type={topic.difficulty} />
                    <Badge type={topic.importance} />
                    <Badge type={topic.completionStatus} />
                    {isOverdue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold uppercase animate-pulse">
                        Revision Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {topic.title}
                  </h3>

                  {topic.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {topic.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                    <span>
                      Interval: <strong className="text-slate-300 font-mono">{topic.intervalDays || 1}d</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Successes: <strong className="text-slate-300 font-mono">{topic.consecutiveSuccesses || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Next Review: <strong className="text-slate-300 font-mono">
                        {topic.nextRevisionDate ? new Date(topic.nextRevisionDate).toLocaleDateString() : 'Pending'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="w-32">
                    <ProgressBar
                      value={topic.masteryScore || 0}
                      label="Mastery"
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => setSelectedTopicToRevise(topic)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(topic)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Edit Topic"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTopic(tId)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete Topic"
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

      {/* Add / Edit Topic Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTopic ? 'Edit Topic' : 'Add Topic to Subject'}
      >
        <form onSubmit={handleSaveTopic} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Red-Black Tree Balancing & Rotations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Learning Objectives
            </label>
            <textarea
              rows="2"
              placeholder="Key concepts, edge cases, formula derivations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="VERY_HARD">Very Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Exam Importance
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
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
              {saving ? 'Saving...' : editingTopic ? 'Update Topic' : 'Add Topic'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Spaced Revision Review Modal */}
      <RevisionModal
        isOpen={!!selectedTopicToRevise}
        topic={selectedTopicToRevise}
        onClose={() => setSelectedTopicToRevise(null)}
        onRevisionComplete={() => fetchSubjectAndTopics()}
      />
    </div>
  );
};

export default SubjectDetails;
