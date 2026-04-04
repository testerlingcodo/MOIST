import { useCallback, useEffect, useState } from 'react';
import client from '../../api/client';

const ACTION_LABELS = {
  submit_for_subject_enrollment: 'Sent for Subject Enrollment',
  subject_enrollment: 'Enrolled Subjects',
  approve_assessment: 'Approved Assessment',
  confirm_payment_enrolled: 'Confirmed Payment & Enrolled',
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
};

const ACTION_COLORS = {
  submit_for_subject_enrollment: { color: '#d97706', bg: '#fef3c7' },
  subject_enrollment: { color: '#2563eb', bg: '#dbeafe' },
  approve_assessment: { color: '#16a34a', bg: '#dcfce7' },
  confirm_payment_enrolled: { color: '#7c3aed', bg: '#ede9fe' },
  created: { color: '#16a34a', bg: '#dcfce7' },
  updated: { color: '#d97706', bg: '#fef3c7' },
  deleted: { color: '#dc2626', bg: '#fee2e2' },
};

const ENTITY_LABELS = {
  enrollment_batch: 'Enrollment',
  student: 'Student',
  grade: 'Grade',
  user: 'User',
  subject: 'Subject',
};

function ActionBadge({ action }) {
  const label = ACTION_LABELS[action] || action?.replace(/_/g, ' ') || '—';
  const { color, bg } = ACTION_COLORS[action] || { color: '#475569', bg: '#f1f5f9' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg }}>
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    admin: '#7c3aed', registrar: '#2563eb', dean: '#d97706',
    cashier: '#16a34a', teacher: '#0891b2', staff: '#475569',
  };
  const color = colors[role] || '#94a3b8';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {role || '—'}
    </span>
  );
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (filterEntity) params.entity = filterEntity;
      const res = await client.get('/audit-logs', { params });
      setLogs(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterEntity]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track who did what and when across the system.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          className="input max-w-xs"
          placeholder="Search name, description..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input w-48"
          value={filterEntity}
          onChange={e => { setFilterEntity(e.target.value); setPage(1); }}
        >
          <option value="">All Modules</option>
          {Object.entries(ENTITY_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => { setSearch(''); setFilterEntity(''); setPage(1); }}>
          Clear
        </button>
        <span className="ml-auto text-sm text-slate-400 self-center">{total} record(s)</span>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Timestamp', 'Actor', 'Role', 'Action', 'Module', 'Description'].map(h => (
                <th key={h} className="table-header-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">No logs found</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="table-row">
                <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                <td className="table-cell">
                  <span className="font-semibold text-slate-800 text-sm">{log.actor_name || '—'}</span>
                </td>
                <td className="table-cell"><RoleBadge role={log.actor_role} /></td>
                <td className="table-cell"><ActionBadge action={log.action} /></td>
                <td className="table-cell text-xs text-slate-500">{ENTITY_LABELS[log.entity] || log.entity}</td>
                <td className="table-cell text-sm text-slate-600 max-w-xs">{log.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button className="btn-secondary text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
