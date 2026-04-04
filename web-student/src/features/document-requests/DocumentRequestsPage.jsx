import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';

const STATUS_META = {
  pending:           { label: 'Pending',           step: 0, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_process:        { label: 'In Process',         step: 1, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready_for_release: { label: 'Ready for Release',  step: 2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:         { label: 'Completed',           step: 3, cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  rejected:          { label: 'Rejected',            step: -1, cls: 'bg-red-50 text-red-700 border-red-200' },
};

const STEPS = ['Pending', 'In Process', 'Ready for Release', 'Completed'];

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function StepTracker({ status }) {
  const step = STATUS_META[status]?.step ?? 0;
  const rejected = status === 'rejected';
  return (
    <div className="mt-3 flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = !rejected && i < step;
        const active = !rejected && i === step;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                done ? 'bg-emerald-500 text-white' :
                active ? 'text-white ring-2 ring-[#7a1324] ring-offset-1' :
                'bg-slate-100 text-slate-400'
              }`} style={active ? { background: '#7a1324' } : {}}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1 text-center text-[9px] leading-tight ${
                active ? 'font-bold text-[#7a1324]' : done ? 'text-emerald-600' : 'text-slate-400'
              }`} style={{ maxWidth: 56 }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 flex-1 mx-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestForm({ docTypes, onSubmit, onCancel }) {
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docType) { toast.error('Please select a document type'); return; }
    setBusy(true);
    try {
      await onSubmit({ document_type: docType, purpose, copies });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-base font-black text-slate-800">New Document Request</h2>
      <p className="mb-5 text-xs text-slate-400">Fill in the details below. You will be notified once your request is processed.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Document Type *</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input" required>
            <option value="">— Select document —</option>
            {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Purpose</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="input"
            rows={2}
            placeholder="e.g. For employment, scholarship application..."
          />
        </div>
        <div>
          <label className="label">Number of Copies</label>
          <input
            type="number"
            min="1"
            max="10"
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
            className="input w-24"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DocumentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        client.get('/document-requests/mine'),
        client.get('/document-requests/types'),
      ]);
      setRequests(reqRes.data || []);
      setDocTypes(typesRes.data || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (data) => {
    try {
      await client.post('/document-requests', data);
      toast.success('Request submitted successfully!');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  const active = requests.filter((r) => !['completed', 'rejected'].includes(r.status));
  const history = requests.filter((r) => ['completed', 'rejected'].includes(r.status));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Document Requests</h1>
          <p className="page-subtitle">Request official school documents and track their status.</p>
        </div>
        {!showForm && (
          <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
            + New Request
          </button>
        )}
      </div>

      {showForm && (
        <RequestForm
          docTypes={docTypes}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="card py-12 text-center text-slate-400">Loading...</div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Active Requests</p>
              {active.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-800">{r.document_type}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {r.copies} cop{r.copies !== 1 ? 'ies' : 'y'}
                        {r.purpose ? ` · ${r.purpose}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <StepTracker status={r.status} />
                  {r.remarks && (
                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <span className="font-semibold">Note from Registrar: </span>{r.remarks}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-slate-400">
                    Requested {new Date(r.requested_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">History</p>
              {history.map((r) => (
                <div key={r.id} className="card p-4 opacity-70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-700">{r.document_type}</p>
                      <p className="text-xs text-slate-400">
                        {r.copies} cop{r.copies !== 1 ? 'ies' : 'y'}
                        {r.purpose ? ` · ${r.purpose}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.remarks && (
                    <p className="mt-2 text-xs text-slate-500">Remarks: {r.remarks}</p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    {new Date(r.requested_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {requests.length === 0 && !showForm && (
            <div className="card py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="h-7 w-7">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="font-black text-slate-700">No document requests yet</p>
              <p className="mt-1 text-sm text-slate-400">Click "+ New Request" to request your first document.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
