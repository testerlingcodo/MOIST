import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const SEM_LABELS = { '1st': '1st Semester', '2nd': '2nd Semester', summer: 'Summer Term' };

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function NewSettingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ school_year: '', semester: '1st', label: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/academic-settings', form);
      toast.success('Academic term added');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add term');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">School Year *</label>
        <input
          className="input"
          required
          placeholder="e.g. 2025-2026"
          value={form.school_year}
          onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))}
        />
      </div>
      <div>
        <label className="label">Semester *</label>
        <select
          className="input"
          value={form.semester}
          onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
        >
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="summer">Summer Term</option>
        </select>
      </div>
      <div>
        <label className="label">Label (optional)</label>
        <input
          className="input"
          placeholder="e.g. A.Y. 2025-2026 First Semester"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add Term'}
        </button>
      </div>
    </form>
  );
}

export default function AcademicSettingsPage() {
  const { confirm, confirmProps } = useConfirm();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/academic-settings');
      setSettings(res.data?.data || []);
    } catch {
      toast.error('Failed to load academic settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id, label) => {
    setActivating(id);
    try {
      await client.patch(`/academic-settings/${id}/activate`);
      toast.success(`${label} set as active term`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to activate');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm({ title: 'Delete Academic Term', message: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' })) return;
    setDeleting(id);
    try {
      await client.delete(`/academic-settings/${id}`);
      toast.success('Term deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const active = settings.find(s => s.is_active);

  return (
    <div className="p-8 max-w-4xl">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Academic Settings</h1>
          <p className="page-subtitle">Manage school year and semester configurations.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Term
        </button>
      </div>

      {/* Active term banner */}
      {active && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} className="w-5 h-5">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Currently Active Term</p>
            <p className="text-base font-black text-green-900">
              {active.label || `${active.school_year} — ${SEM_LABELS[active.semester]}`}
            </p>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['School Year', 'Semester', 'Label', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="table-header-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : settings.length === 0 ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">No academic terms configured yet</td></tr>
            ) : settings.map(s => (
              <tr key={s.id} className="table-row">
                <td className="table-cell font-semibold text-slate-900">{s.school_year}</td>
                <td className="table-cell text-slate-600">{SEM_LABELS[s.semester] || s.semester}</td>
                <td className="table-cell text-slate-500 text-sm">{s.label || '—'}</td>
                <td className="table-cell">
                  {s.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-green-700 bg-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Inactive</span>
                  )}
                </td>
                <td className="table-cell text-slate-500 text-xs">{formatDate(s.created_at)}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    {!s.is_active && s.can_activate && (
                      <button
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        disabled={activating === s.id}
                        onClick={() => handleActivate(s.id, s.label || `${s.school_year} ${SEM_LABELS[s.semester]}`)}
                      >
                        {activating === s.id ? 'Activating...' : 'Set Active'}
                      </button>
                    )}
                    {!s.is_active && !s.can_activate && (
                      <span className="text-xs font-medium text-amber-600">Locked by history</span>
                    )}
                    {!s.is_active && !s.has_history && (
                      <button
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                        disabled={deleting === s.id}
                        onClick={() => handleDelete(s.id)}
                      >
                        {deleting === s.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                    {s.is_active && (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Academic Term">
        <NewSettingModal onClose={() => setModal(false)} onCreated={load} />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
