import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';

const STATUS_OPTIONS = ['pending', 'in_process', 'ready_for_release', 'completed', 'rejected'];

const STATUS_META = {
  pending:           { label: 'Pending',            cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_process:        { label: 'In Process',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready_for_release: { label: 'Ready for Release',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:         { label: 'Completed',            cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  rejected:          { label: 'Rejected',             cls: 'bg-red-50 text-red-700 border-red-200' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function UpdateModal({ request, onClose, onUpdated }) {
  const [status, setStatus] = useState(request.status);
  const [remarks, setRemarks] = useState(request.remarks || '');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await client.patch(`/document-requests/${request.id}/status`, { status, remarks });
      toast.success('Request updated');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-base font-black text-slate-800">Update Request</h3>
        <p className="mb-4 text-xs text-slate-500">{request.document_type} — {request.last_name}, {request.first_name}</p>

        <div className="space-y-4">
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="input"
              rows={3}
              placeholder="Add a note for the student..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/document-requests', {
        params: { status: filterStatus || undefined, search: search || undefined },
      });
      setRequests(res.data.data || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = requests.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">Document Requests</h1>
        <p className="page-subtitle">Manage and process student document requests.</p>
      </div>

      {/* Summary pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              filterStatus === s
                ? STATUS_META[s].cls + ' ring-2 ring-offset-1 ring-current'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {STATUS_META[s].label} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-5 flex flex-wrap gap-3 p-4">
        <input
          type="text"
          className="input flex-1"
          placeholder="Search student name, ID, or document type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-secondary text-sm" onClick={load}>Refresh</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              {['Student', 'Document Type', 'Copies', 'Purpose', 'Status', 'Requested', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No requests found.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{r.last_name}, {r.first_name}</p>
                  <p className="text-xs text-slate-400">{r.student_number} · {r.course} Yr{r.year_level}</p>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{r.document_type}</td>
                <td className="px-4 py-3 text-center text-slate-600">{r.copies}</td>
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="truncate text-xs text-slate-500">{r.purpose || '—'}</p>
                  {r.remarks && <p className="mt-0.5 truncate text-xs text-blue-600">Note: {r.remarks}</p>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(r.requested_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-xs font-medium text-[#7a1324] hover:underline"
                    onClick={() => setSelected(r)}
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <UpdateModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
