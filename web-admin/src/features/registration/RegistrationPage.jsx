import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';

function instructorLabel(subject) {
  if (subject?.teacher_last_name || subject?.teacher_first_name) {
    return `${subject.teacher_last_name || ''}${subject.teacher_first_name ? `, ${subject.teacher_first_name}` : ''}`;
  }
  return 'TBA';
}

function dayLabel(subject) {
  return subject?.schedule_days || 'TBA';
}

function timeLabel(subject) {
  return subject?.start_time && subject?.end_time
    ? `${subject.start_time}-${subject.end_time}`
    : 'TBA';
}

/* ── 4-up landscape slip printer (matches staff style) ──────── */
function printEnrollmentSlip(batch, totalPaid = 0) {
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const totalUnits = (batch.subjects || []).reduce((s, sub) => s + Number(sub.units || 0), 0);
  const dateNow = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const copies = ['Student', "Dean's", 'Finance', "Registrar's"];
  const assessed = Number(batch.assessed_amount || 0);
  const paid = Number(totalPaid || 0);
  const balance = Math.max(0, assessed - paid);
  const sealUrl = `${window.location.origin}/moist-seal.png`;

  const subjectRows = (batch.subjects || []).map((s) => `
    <tr>
      <td>${s.subject_code || ''}</td>
      <td class="subj-name">${s.subject_name || ''}</td>
      <td class="c">${s.units || ''}</td>
      <td>${instructorLabel(s)}</td>
      <td>${dayLabel(s)}</td>
      <td>${timeLabel(s)}</td>
      <td>${s.room || 'TBA'}</td>
    </tr>`).join('');

  const oneSlip = (label) => `
    <div class="slip">
      <div class="hdr">
        <img src="${sealUrl}" alt="" onerror="this.style.display='none'" />
        <div class="school-info">
          <div class="school-name">MOIST, INC.</div>
          <div class="school-sub">Balingasag, Misamis Oriental</div>
          <div class="doc-type">Office of the Registrar &nbsp;|&nbsp; Certificate of Registration</div>
        </div>
        <span class="copy-tag">${label} Copy</span>
      </div>
      <div class="slip-body">
        <div class="slip-main">
          <div class="info">
            <div><span class="lbl">Student No.: </span>${batch.student_number || ''}</div>
            <div><span class="lbl">Name: </span>${(batch.last_name || '').toUpperCase()}, ${batch.first_name || ''}</div>
            <div><span class="lbl">Course / Year: </span>${batch.course || ''} — Year ${batch.year_level || ''}</div>
            <div><span class="lbl">School Year: </span>${batch.school_year || ''} · ${batch.semester || ''} Semester</div>
            <div><span class="lbl">Date Issued: </span>${dateNow}</div>
            <div class="status-row"><span class="lbl">Status: </span><span class="status-val">OFFICIALLY ENROLLED</span></div>
          </div>
          <table>
            <thead><tr><th>Code</th><th>Subject</th><th class="c">Units</th><th>Instructor</th><th>Days</th><th>Time</th><th>Room</th></tr></thead>
            <tbody>${subjectRows}</tbody>
            <tfoot><tr><td colspan="2" class="r bold">Total Units:</td><td class="c bold">${totalUnits}</td><td colspan="4">Sec: ${(batch.subjects || [])[0]?.section_name || 'TBA'}</td></tr></tfoot>
          </table>
          ${label === 'Student' ? `<div class="welcome">Welcome, Moistian!<br/>You are officially enrolled. We are proud to have you!</div>` : ''}
        </div>
        <div class="aside">
          <div class="aside-title">ASSESSMENT</div>
          <div class="aside-item">
            <div class="aside-lbl">Total Tuition Fee</div>
            <div class="aside-val">${assessed > 0 ? fmt(assessed) : '—'}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Enrollment Fee Paid</div>
            <div class="aside-val" style="color:#166534">${fmt(paid)}</div>
          </div>
          <div class="aside-item aside-balance">
            <div class="aside-lbl">Remaining Balance</div>
            <div class="aside-val" style="color:${balance > 0 ? '#7a1324' : '#166534'}">${assessed > 0 ? fmt(balance) : '—'}</div>
          </div>
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<title>Enrollment Slip — ${(batch.last_name || '').toUpperCase()}, ${batch.first_name || ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{width:100%;height:100%;margin:0;padding:0;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:8pt;color:#111;background:#fff}
  .page{display:flex;flex-direction:column;width:100%;height:100vh}
  @media print{.page{width:100%;height:100%}}
  .slip{padding:3mm 5mm;border:1px solid rgba(122,19,36,0.3);display:flex;flex-direction:column;gap:2px;overflow:hidden;flex:1;background:#fff}
  .slip+.slip{border-top:1.5px dashed rgba(122,19,36,0.5)}
  .hdr{display:flex;align-items:center;gap:5px;border-bottom:2px solid #f6c445;padding-bottom:4px;margin-bottom:3px}
  .hdr img{width:30px;height:30px;object-fit:contain;flex-shrink:0}
  .school-info{flex:1}
  .school-name{font-size:9pt;font-weight:900;color:#7a1324;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
  .school-sub{font-size:6pt;color:#555;line-height:1.3}
  .doc-type{font-size:6.5pt;font-weight:700;color:#374151;margin-top:1px}
  .copy-tag{font-size:6.5pt;background:#fff8eb;border:1px solid #f6c445;color:#7a1324;padding:2px 7px;border-radius:10px;font-weight:800;white-space:nowrap;align-self:flex-start}
  .slip-body{display:flex;gap:4mm;flex:1;margin-top:2px}
  .slip-main{flex:1;display:flex;flex-direction:column;gap:2px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;font-size:7.5pt;margin-bottom:3px}
  .lbl{color:#7a1324;font-weight:700}
  .status-row{grid-column:1/-1}
  .status-val{font-weight:900;color:#166534;letter-spacing:.4px}
  table{width:100%;border-collapse:collapse;font-size:7pt}
  th{background:#fff8eb;border:1px solid rgba(122,19,36,0.22);padding:1.5px 3px;text-align:left;font-weight:800;color:#5a0d1a;white-space:nowrap}
  td{border:1px solid rgba(122,19,36,0.15);padding:1.5px 3px;vertical-align:middle}
  tfoot td{background:#fff8eb;border:1px solid rgba(122,19,36,0.22);font-weight:800;color:#7a1324}
  .subj-name{font-weight:700}
  .c{text-align:center}.r{text-align:right}.bold{font-weight:800}
  .welcome{margin-top:auto;font-size:6.5pt;font-weight:900;color:#7a1324;text-align:center;line-height:1.5;letter-spacing:.3px;padding-top:3px;border-top:1.5px solid rgba(122,19,36,0.3)}
  .aside{width:42mm;flex-shrink:0;border-left:1.5px dashed rgba(122,19,36,0.4);padding-left:4mm;display:flex;flex-direction:column;gap:5px}
  .aside-title{font-size:7.5pt;font-weight:900;color:#7a1324;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid rgba(122,19,36,0.3);padding-bottom:2px}
  .aside-item{display:flex;flex-direction:column;gap:1px}
  .aside-lbl{font-size:6pt;color:#666}
  .aside-val{font-size:8.5pt;font-weight:800;color:#111}
  .aside-balance{border-top:1px solid rgba(122,19,36,0.25);padding-top:3px;margin-top:1px}
  @page{size:legal portrait;margin:6mm}
  @media print{html,body{height:100%}}
</style></head>
<body>
  <div class="page">
    ${copies.map((c) => oneSlip(c)).join('')}
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
  else { toast.error('Allow pop-ups to print the enrollment slip.'); }
}

/* ── Register + Print modal ─────────────────────────────────── */
function RegisterModal({ batch, onClose, onDone }) {
  const [registering, setRegistering] = useState(false);
  const [payments, setPayments] = useState([]);
  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((s, sub) => s + Number(sub.units || 0), 0);
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const assessed = Number(batch?.assessed_amount || 0);

  useEffect(() => {
    if (!batch?.id) return;
    client.get(`/payments/batch/${batch.id}`)
      .then(res => setPayments(res.data || []))
      .catch(() => setPayments([]));
  }, [batch?.id]);

  const totalPaid = payments.filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, assessed - totalPaid);

  const handleConfirm = async () => {
    setRegistering(true);
    try {
      await client.patch(`/enrollment-batches/${batch.id}/register`);
      toast.success(`${batch.last_name}, ${batch.first_name} is now officially enrolled.`);
      printEnrollmentSlip(batch, totalPaid);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setRegistering(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Student</p>
          <p className="font-bold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-xs font-mono text-slate-500">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Course / Year</p>
          <p className="font-semibold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-xs text-slate-500">{batch?.school_year} · {batch?.semester} Semester</p>
        </div>
      </div>

      {/* Subjects */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between">
          <p className="font-semibold text-slate-900 text-sm">Enrolled Subjects</p>
          <span className="text-xs font-bold text-slate-600">{subjects.length} subjects · {totalUnits} units</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-100">
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-right px-4 py-2 font-medium">Units</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subject_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{s.subject_code}</td>
                  <td className="px-4 py-2 text-slate-700">{s.subject_name}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-700">{s.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee */}
      <div className="rounded-xl border border-emerald-200 overflow-hidden text-sm">
        <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-50 border-b border-emerald-200">
          <span className="text-emerald-800 font-semibold">Total Tuition Fee</span>
          <span className="font-black text-emerald-900">{fmt(assessed)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-emerald-100">
          <span className="text-slate-600 font-semibold">Enrollment Fee Paid</span>
          <span className="font-black text-emerald-700">{fmt(totalPaid)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 bg-white">
          <span className="text-slate-600 font-semibold">Remaining Balance</span>
          <span className={`font-black ${remaining > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(remaining)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
        Clicking <strong>"Officially Enroll &amp; Print"</strong> will:
        <ol className="list-decimal list-inside mt-1 space-y-0.5 text-xs text-teal-700">
          <li>Mark the student as <strong>Officially Enrolled</strong></li>
          <li>Open a print window with <strong>4 copies</strong> on one landscape bond paper</li>
          <li>Distribute: Student · Dean's · Finance · Registrar's</li>
        </ol>
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary flex items-center gap-2"
          disabled={registering}
          onClick={handleConfirm}
        >
          {registering ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Enrolling…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Officially Enroll &amp; Print
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function RegistrationPage() {
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const debounceRef = useRef(null);
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const load = useCallback(async (searchVal = '') => {
    setLoading(true);
    try {
      const params = { status: 'for_registration', limit: 100 };
      if (searchVal.trim()) params.search = searchVal.trim();
      const res = await client.get('/enrollment-batches', { params });
      setBatches(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load registration queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 300);
  };

  const openRegister = async (batch) => {
    setLoadingDetail(true);
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      setSelectedBatch(res.data);
    } catch {
      toast.error('Failed to load student details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReprint = async (batch) => {
    try {
      const detailRes = await client.get(`/enrollment-batches/${batch.id}`);
      let totalPaid = 0;
      try {
        const paymentsRes = await client.get(`/payments/batch/${batch.id}`);
        const payments = paymentsRes.data || [];
        totalPaid = payments.filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);
      } catch { /* payments unavailable, print with 0 */ }
      printEnrollmentSlip(detailRes.data, totalPaid);
    } catch {
      toast.error('Failed to load batch for reprint');
    }
  };

  return (
    <div className="p-8">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Official Registration</h1>
          <p className="page-subtitle">
            Students who completed payment and are waiting to be officially enrolled. Print 4-copy enrollment slip.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            {loading ? '…' : total} for registration
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="input pl-9"
          placeholder="Search by name or student number…"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Student', 'Course / Year', 'School Year / Semester', 'Total Assessment', 'Actions'].map((h) => (
                <th key={h} className="table-header-cell">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="table-cell py-12 text-center text-slate-400">Loading…</td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-slate-300">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    <p className="text-sm">No students in the registration queue</p>
                    <p className="text-xs text-slate-300">
                      {search ? 'Try a different search term.' : 'Students will appear here once payment has been verified.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : batches.map((batch) => (
              <tr key={batch.id} className="table-row">
                <td className="table-cell">
                  <p className="font-semibold text-slate-900">{batch.last_name}, {batch.first_name}</p>
                  <p className="text-xs font-mono text-slate-400">{batch.student_number}</p>
                </td>
                <td className="table-cell">
                  <p className="font-semibold text-slate-800">{batch.course}</p>
                  <p className="text-xs text-slate-400">Year {batch.year_level}</p>
                </td>
                <td className="table-cell text-slate-600 text-sm">
                  <p>{batch.school_year}</p>
                  <p className="text-xs text-slate-400">{batch.semester} Semester</p>
                </td>
                <td className="table-cell font-semibold text-slate-800">
                  {batch.assessed_amount ? fmt(batch.assessed_amount) : (
                    <span className="text-amber-600 text-xs italic">Not set</span>
                  )}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#0f766e,#14b8a6)' }}
                      disabled={loadingDetail}
                      onClick={() => openRegister(batch)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Enroll &amp; Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && !loading && (
        <p className="mt-3 text-sm text-slate-400">{total} student(s) waiting for official enrollment</p>
      )}

      {/* Also show already-enrolled for reprint */}
      <EnrolledReprintSection onReprint={handleReprint} />

      <Modal
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        title="Official Enrollment & Print Slip"
        size="lg"
      >
        {selectedBatch && (
          <RegisterModal
            batch={selectedBatch}
            onClose={() => setSelectedBatch(null)}
            onDone={() => load(search)}
          />
        )}
      </Modal>
    </div>
  );
}

/* ── Enrolled reprint section ───────────────────────────────── */
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'];

function buildSchoolYears() {
  const years = [];
  const current = new Date().getFullYear();
  for (let y = current + 1; y >= current - 5; y--) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}

function EnrolledReprintSection({ onReprint }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async (searchVal = '', sy = schoolYear, sem = semester) => {
    setLoading(true);
    try {
      const params = { status: 'enrolled', limit: 50 };
      if (searchVal.trim()) params.search = searchVal.trim();
      if (sy) params.school_year = sy;
      if (sem) params.semester = sem;
      const res = await client.get('/enrollment-batches', { params });
      setBatches(res.data?.data || []);
    } catch { setBatches([]); }
    finally { setLoading(false); }
  }, [schoolYear, semester]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 300);
  };

  const handleSchoolYear = (e) => {
    const val = e.target.value;
    setSchoolYear(val);
    load(search, val, semester);
  };

  const handleSemester = (e) => {
    const val = e.target.value;
    setSemester(val);
    load(search, schoolYear, val);
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <button
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Reprint Enrollment Slip for Enrolled Students
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" className="input pl-9" placeholder="Search enrolled students…" value={search} onChange={handleSearch} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">School Year</label>
              <select className="input text-sm" value={schoolYear} onChange={handleSchoolYear}>
                <option value="">All Years</option>
                {buildSchoolYears().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Semester</label>
              <select className="input text-sm" value={semester} onChange={handleSemester}>
                <option value="">All Semesters</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400 py-4">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No enrolled students found.</p>
          ) : (
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Student', 'Course / Year', 'School Year', 'Actions'].map((h) => (
                      <th key={h} className="table-header-cell">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-900">{b.last_name}, {b.first_name}</p>
                        <p className="text-xs font-mono text-slate-400">{b.student_number}</p>
                      </td>
                      <td className="table-cell text-slate-600">{b.course} — Year {b.year_level}</td>
                      <td className="table-cell text-slate-600">{b.school_year} · {b.semester}</td>
                      <td className="table-cell">
                        <button
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                          onClick={() => onReprint(b)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                          </svg>
                          Reprint Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

