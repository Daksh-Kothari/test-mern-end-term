import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import { FileText, Plus, Search, Trash2, Edit, AlertCircle, BookOpen } from 'lucide-react';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotesAndSubjects = async () => {
    try {
      setLoading(true);
      const [notesRes, subjectsRes] = await Promise.all([
        api.get('/notes'),
        api.get('/subjects')
      ]);
      setNotes(notesRes.data.notes || []);
      setSubjects(subjectsRes.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndSubjects();
  }, []);

  // Fetch topics when subject in modal changes
  useEffect(() => {
    if (subjectId) {
      api.get(`/topics?subjectId=${subjectId}`)
        .then(res => setTopics(res.data.topics || []))
        .catch(err => console.error(err));
    } else {
      setTopics([]);
      setTopicId('');
    }
  }, [subjectId]);

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setSubjectId(subjects[0]?._id || subjects[0]?.id || '');
    setTopicId('');
    setTitle('');
    setContent('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note) => {
    setEditingNote(note);
    setSubjectId(note.subject?._id || note.subject?.id || note.subject || '');
    setTopicId(note.topic?._id || note.topic?.id || note.topic || '');
    setTitle(note.title);
    setContent(note.content);
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteNote = async (nId) => {
    if (!window.confirm('Delete this academic note?')) return;
    try {
      await api.delete(`/notes/${nId}`);
      setNotes(prev => prev.filter(n => (n._id !== nId && n.id !== nId)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSaving(true);
      setError('');
      const payload = {
        title: title.trim(),
        content: content.trim(),
        subjectId: subjectId || null,
        topicId: topicId || null
      };

      if (editingNote) {
        const id = editingNote._id || editingNote.id;
        await api.patch(`/notes/${id}`, payload);
      } else {
        await api.post('/notes', payload);
      }

      setIsModalOpen(false);
      fetchNotesAndSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = !search || 
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !selectedSubjectFilter || 
      (n.subject?._id === selectedSubjectFilter || n.subject === selectedSubjectFilter);
    return matchesSearch && matchesSubject;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Notes</h1>
          <p className="text-xs text-slate-400 mt-1">
            Store key definitions, proofs, formula cheat sheets, and conceptual takeaways.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes content or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Subjects</option>
          {subjects.map(s => (
            <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8 space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Notes Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Jot down key takeaways while learning to quickly reference during flashcard revisions.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map(note => {
            const nId = note._id || note.id;
            return (
              <div
                key={nId}
                className="glass-panel rounded-2xl p-5 border border-slate-800/90 glass-panel-hover flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {note.title}
                    </h3>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(note)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Note"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(nId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-6 bg-slate-900/40 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                    {note.content}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Updated {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edit Academic Note' : 'Create Academic Note'}
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Theorem Master Chart & Cases"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None / General Note</option>
                {subjects.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Related Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!subjectId}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">None</option>
                {topics.map(t => (
                  <option key={t._id || t.id} value={t._id || t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note Content *
            </label>
            <textarea
              rows="7"
              required
              placeholder="Write formulas, definitions, key code snippets, and explanations..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
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
              {saving ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Notes;
