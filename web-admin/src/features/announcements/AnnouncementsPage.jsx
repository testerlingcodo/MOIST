import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const CATEGORIES = ['general', 'exam', 'event', 'urgent'];

const CATEGORY_COLORS = {
  general: 'info',
  exam: 'warning',
  event: 'success',
  urgent: 'danger',
};

function AnnouncementForm({ onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Title *</label>
        <input {...register('title', { required: true })} className="input" placeholder="Announcement title" />
        {errors.title && <p className="text-red-500 text-xs mt-1">Required</p>}
      </div>
      <div>
        <label className="label">Category</label>
        <select {...register('category')} className="input">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Message *</label>
        <textarea
          {...register('body', { required: true })}
          className="input"
          rows={5}
          placeholder="Type your announcement here..."
        />
        {errors.body && <p className="text-red-500 text-xs mt-1">Required</p>}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Announcement'}
        </button>
      </div>
    </form>
  );
}

export default function AnnouncementsPage() {
  const { confirm, confirmProps } = useConfirm();
  const role = useSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'admin';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/announcements', {
        params: { limit: 50, ...(categoryFilter ? { category: categoryFilter } : {}) },
      });
      setAnnouncements(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async (data) => {
    try {
      await client.post('/announcements', data);
      toast.success('Announcement posted');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm({ title: 'Delete Announcement', message: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await client.delete(`/announcements/${id}`);
      toast.success('Announcement deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">School announcements, exam schedules, and event notices.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input max-w-[160px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setModal(true)}>
              + Post Announcement
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-16">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-slate-300 mx-auto mb-3">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
          </svg>
          <p className="text-slate-400 text-sm">No announcements yet.</p>
          {isAdmin && (
            <button className="btn-primary mt-4" onClick={() => setModal(true)}>
              Post First Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={CATEGORY_COLORS[ann.category] || 'info'}>
                      {ann.category}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {ann.posted_by_email && (
                      <span className="text-xs text-slate-400">· {ann.posted_by_email}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{ann.title}</h3>
                  <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{ann.body}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete announcement"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Post Announcement" size="md">
        <AnnouncementForm onSubmit={handlePost} onCancel={() => setModal(false)} />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
