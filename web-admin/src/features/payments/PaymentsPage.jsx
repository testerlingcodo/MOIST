import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { useActiveTerm } from '../../hooks/useActiveTerm';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const METHOD_LABEL = {
  cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank Transfer',
  xendit: 'Xendit', credit_card: 'Credit Card', qris: 'QRIS', ovo: 'OVO', dana: 'DANA',
};

const PERIOD_LABEL = {
  enrollment_fee: 'Enrollment Fee',
  prelim:         'Prelim',
  midterm:        'Midterm',
  semi_finals:    'Semi-Finals',
  finals:         'Finals',
};

const PAYMENT_STATUS_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const BATCH_STATUS_LABEL = {
  for_payment:      { label: 'For Payment',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  for_registration: { label: 'For Registration', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  enrolled:         { label: 'Enrolled',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const isManualPendingSubmission = (payment) =>
  payment?.status === 'pending' &&
  !payment?.xendit_invoice_id &&
  payment?.payment_method !== 'xendit';

/* ─── SOA Print ─────────────────────────────────────────────── */
function buildSoaHtml(batch, payments) {
  const sealUrl = `${window.location.origin}/moist-seal.png`;
  const assessed = Number(batch?.assessed_amount || 0);
  const carryOverPrint = Number(batch?.carry_over_balance || 0);
  const miscFee = Number(batch?.misc_fee || 0);
  const tuitionFee = assessed > 0 ? Math.max(0, assessed - carryOverPrint - miscFee) : 0;
  const postedPayments = (payments || []).filter((p) => p.status === 'verified');
  const totalPaid = postedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, assessed - totalPaid);
  const isFullyPaid = assessed > 0 && balance <= 0;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const payRows = postedPayments.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:6px 3px;font-style:italic">No payment records</td></tr>`
    : postedPayments.map(p => `
      <tr>
        <td>${fmtDate(p.created_at)}</td>
        <td>${METHOD_LABEL[p.payment_method] || 'Cash'}</td>
        <td>${PERIOD_LABEL[p.payment_period] || '—'}</td>
        <td style="text-align:right;font-weight:700">${fmt(p.amount)}</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>SOA — ${batch?.last_name}, ${batch?.first_name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    @page { size: A6 portrait; margin: 7mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px; background: white; }
    .hdr { display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #f6c445; padding-bottom: 5px; margin-bottom: 5px; }
    .hdr img { width: 30px; height: 30px; object-fit: contain; flex-shrink: 0; }
    .school-name { font-size: 9px; font-weight: 900; color: #7a1324; text-transform: uppercase; letter-spacing: 0.07em; line-height: 1.1; }
    .school-sub { font-size: 6px; color: #555; }
    .doc-title { font-size: 8px; font-weight: 800; color: #374151; margin-top: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; margin-bottom: 6px; padding: 5px 7px; background: #fff8eb; border: 1px solid rgba(122,19,36,0.2); border-radius: 4px; }
    .info-lbl { font-size: 6px; color: #7a1324; font-weight: 700; text-transform: uppercase; }
    .info-val { font-size: 8px; font-weight: 700; color: #111; }
    .section-title { font-size: 7px; font-weight: 900; color: #7a1324; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid rgba(122,19,36,0.25); padding-bottom: 2px; margin-bottom: 4px; margin-top: 6px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 8px; padding: 1.5px 0; }
    .summary-total { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; border-top: 1.5px solid rgba(122,19,36,0.35); padding-top: 3px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 7px; margin-top: 2px; }
    thead th { background: #fff8eb; border: 1px solid rgba(122,19,36,0.2); padding: 2px 3px; font-weight: 800; color: #5a0d1a; text-align: left; }
    tbody td { border: 1px solid rgba(122,19,36,0.12); padding: 2px 3px; vertical-align: middle; }
    .status-badge { padding: 1px 5px; border-radius: 20px; font-size: 7px; font-weight: 800; }
    .paid-stamp { margin-top: 8px; text-align: center; font-size: 10px; font-weight: 900; color: #065f46; border: 2px solid #065f46; border-radius: 4px; padding: 3px 0; letter-spacing: 1px; opacity: 0.85; }
    .footer { margin-top: 8px; font-size: 6px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="hdr">
    <img src="${sealUrl}" alt="seal" onerror="this.style.display='none'"/>
    <div style="flex:1">
      <div class="school-name">MOIST, INC.</div>
      <div class="school-sub">Balingasag, Misamis Oriental</div>
      <div class="doc-title">Statement of Account</div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-lbl">Student Name</div>
      <div class="info-val">${batch?.last_name || ''}, ${batch?.first_name || ''}</div>
    </div>
    <div>
      <div class="info-lbl">Student No.</div>
      <div class="info-val">${batch?.student_number || '—'}</div>
    </div>
    <div>
      <div class="info-lbl">Course / Year</div>
      <div class="info-val">${batch?.course || '—'} — Yr. ${batch?.year_level || '—'}</div>
    </div>
    <div>
      <div class="info-lbl">School Year</div>
      <div class="info-val">${batch?.school_year || '—'} · ${batch?.semester || '—'} Sem</div>
    </div>
  </div>

  <div class="section-title">Payment Records</div>
  <table>
    <thead>
      <tr>
        <th style="width:26%">Date</th>
        <th style="width:20%">Method</th>
        <th style="width:30%">Period</th>
        <th style="width:24%;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${payRows}</tbody>
  </table>

  <div class="section-title">Assessment Summary</div>
  ${assessed > 0 ? `
  <div class="summary-row"><span>Tuition Fee</span><span style="font-weight:700">${fmt(tuitionFee)}</span></div>
  <div class="summary-row"><span>Miscellaneous Fee</span><span style="font-weight:700">${fmt(miscFee)}</span></div>
  ${carryOverPrint > 0 ? `<div class="summary-row" style="color:#b45309"><span>Carry-over (prev. terms)</span><span style="font-weight:700">${fmt(carryOverPrint)}</span></div>` : ''}
  <div class="summary-row" style="border-top:1px solid rgba(122,19,36,0.15);margin-top:2px;padding-top:2px"><span style="font-weight:800">Total Assessment</span><span style="font-weight:800">${fmt(assessed)}</span></div>
  ` : `<div class="summary-row"><span>Total Assessment</span><span style="color:#b45309;font-style:italic">Not set</span></div>`}
  <div class="summary-row"><span style="color:#065f46">Total Paid</span><span style="font-weight:800;color:#065f46">${fmt(totalPaid)}</span></div>
  <div class="summary-total">
    <span style="color:${balance > 0 ? '#7a1324' : '#065f46'}">Remaining Balance</span>
    <span style="color:${balance > 0 ? '#7a1324' : '#065f46'}">${assessed > 0 ? fmt(balance) : '—'}</span>
  </div>

  ${isFullyPaid ? `<div class="paid-stamp">✓ FULLY PAID</div>` : ''}
  <div class="footer">Printed ${new Date().toLocaleString('en-PH')} · MOIST, Inc. Cashier Office</div>
</body>
</html>`;
}

/* ─── SOA Modal ─────────────────────────────────────────────── */
function SoaModal({ batch, onClose }) {
  const [payments, setPayments] = useState([]);
  const [batchDetail, setBatchDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batch?.id) return;
    setLoading(true);
    Promise.all([
      client.get(`/payments/batch/${batch.id}`),
      client.get(`/enrollment-batches/${batch.id}`),
    ])
      .then(([payRes, batchRes]) => {
        setPayments(payRes.data || []);
        setBatchDetail(batchRes.data);
      })
      .catch((err) => { console.error('Failed to fetch SOA data:', err); })
      .finally(() => setLoading(false));
  }, [batch?.id]);

  const detail = batchDetail || batch;
  const assessed = Number(detail?.assessed_amount || 0);
  const carryOver = Number(detail?.carry_over_balance || 0);
  const miscFee = Number(detail?.misc_fee || 0);
  // base tuition = assessed - carry_over - misc_fee
  const baseTuition = assessed > 0 ? Math.max(0, assessed - carryOver - miscFee) : 0;
  const postedPayments = (payments || []).filter((p) => p.status === 'verified');
  const totalPaid = postedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, assessed - totalPaid);
  const isFullyPaid = assessed > 0 && balance <= 0;

  const handlePrint = () => {
    const html = buildSoaHtml(detail, payments);
    const win = window.open('', '_blank', 'width=500,height=700');
    if (!win) { alert('Allow pop-ups to print the SOA.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => { win.focus(); win.print(); });
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-2xl bg-[#fff8eb] border border-[#f6c445]/40">
        <div>
          <p className="text-[10px] text-[#7a1324] font-bold uppercase tracking-wide mb-0.5">Student</p>
          <p className="font-bold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#7a1324] font-bold uppercase tracking-wide mb-0.5">Course / Year</p>
          <p className="font-bold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Payment records */}
      <div>
        <p className="font-semibold text-slate-900 text-sm mb-3">Payment Records</p>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
        ) : postedPayments.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">No payment records yet</div>
        ) : (
          <div className="space-y-2">
            {postedPayments.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold bg-[#fff8eb] text-[#7a1324] border-[#f6c445]/50">
                      {PERIOD_LABEL[p.payment_period] || '—'}
                    </span>
                    <span className="text-xs text-slate-500">{METHOD_LABEL[p.payment_method] || 'Cash'}</span>
                    <span className="text-sm font-bold text-slate-900">{fmt(p.amount)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(p.created_at)}</p>
                  {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment summary */}
      <div className={`rounded-2xl border overflow-hidden ${isFullyPaid ? 'border-emerald-200' : 'border-orange-200'}`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isFullyPaid ? 'bg-emerald-50' : 'bg-orange-50'}`}>
          <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-900' : 'text-orange-900'}`}>Assessment Summary</p>
          {isFullyPaid && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">FULLY PAID</span>
          )}
        </div>
        <div className="px-4 py-4 space-y-2 text-sm">
          {assessed > 0 ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>Tuition Fee</span>
                <span className="font-semibold">{fmt(baseTuition)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Miscellaneous Fee</span>
                <span className="font-semibold">{fmt(miscFee)}</span>
              </div>
              {carryOver > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Carry-over (prev. terms)</span>
                  <span className="font-semibold">{fmt(carryOver)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-semibold border-t border-slate-100 pt-2">
                <span>Total Assessment</span>
                <span>{fmt(assessed)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-700">
              <span>Total Assessment</span>
              <span className="text-amber-600 text-xs italic">Not set</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-700">
            <span>Total Paid</span>
            <span className="font-semibold">{fmt(totalPaid)}</span>
          </div>
          <div className={`flex justify-between font-bold border-t border-slate-100 pt-2 text-base ${balance > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
            <span>Remaining Balance</span>
            <span>{assessed > 0 ? fmt(balance) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-1">
        <button className="btn-secondary" onClick={onClose}>Close</button>
        <button
          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
          disabled={loading}
          onClick={handlePrint}
        >
          Print SOA (A6)
        </button>
      </div>
    </div>
  );
}

/* ─── Assessment Tab ─────────────────────────────────────────── */
function AssessmentTab() {
  const { schoolYear, semester } = useActiveTerm();

  const [filterSchoolYear, setFilterSchoolYear] = useState(schoolYear || '');
  const [filterSemester, setFilterSemester] = useState(semester || '');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYearLevel, setFilterYearLevel] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [yearLevels] = useState(['1','2','3','4']);

  const [soaModal, setSoaModal] = useState({ open: false, batch: null });

  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filterSchoolYear) params.school_year = filterSchoolYear;
      if (filterSemester) params.semester = filterSemester;
      if (filterCourse) params.course = filterCourse;
      if (filterYearLevel) params.year_level = filterYearLevel;
      if (search.trim()) params.search = search.trim();
      const res = await client.get('/enrollment-batches/assessments', { params });
      setData(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load assessments');
    } finally { setLoading(false); }
  }, [filterSchoolYear, filterSemester, filterCourse, filterYearLevel, search]);

  // load all courses from courses table
  useEffect(() => {
    client.get('/courses')
      .then(res => setCourses((res.data || []).filter(c => c.is_active).map(c => c.code)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 300);
    return () => clearTimeout(searchTimer.current);
  }, [load]);

  useEffect(() => {
    if (schoolYear) setFilterSchoolYear(schoolYear);
    if (semester) setFilterSemester(semester);
  }, [schoolYear, semester]);

  const openSoa = async (row) => {
    try {
      const res = await client.get(`/enrollment-batches/${row.id}`);
      setSoaModal({ open: true, batch: res.data });
    } catch {
      toast.error('Failed to load batch details');
    }
  };

  const SCHOOL_YEARS = (() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => `${cur - i}-${cur - i + 1}`);
  })();

  return (
    <div className="flex gap-5 min-h-0">
      {/* Course sidebar */}
      <div className="w-44 flex-shrink-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Course</p>
        <div className="space-y-1">
          <button
            onClick={() => { setFilterCourse(''); setFilterYearLevel(''); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterCourse === '' ? 'bg-[#7a1324] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Courses
          </button>
          {courses.map(c => (
            <button
              key={c}
              onClick={() => { setFilterCourse(c); setFilterYearLevel(''); }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filterCourse === c ? 'bg-[#7a1324] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
          {courses.length === 0 && !loading && (
            <p className="text-xs text-slate-400 px-1">No data yet</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top filters row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <select
            className="input w-44 text-sm"
            value={filterSchoolYear}
            onChange={e => setFilterSchoolYear(e.target.value)}
          >
            <option value="">All School Years</option>
            {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="input w-36 text-sm"
            value={filterSemester}
            onChange={e => setFilterSemester(e.target.value)}
          >
            <option value="">All Semesters</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
            <option value="Summer">Summer</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="input pl-9 text-sm"
              placeholder="Search student name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {total > 0 && <span className="text-sm text-slate-400 ml-auto">{total} student{total !== 1 ? 's' : ''}</span>}
        </div>

        {/* Year level pill tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Year Level:</span>
          <button
            onClick={() => setFilterYearLevel('')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filterYearLevel === ''
                ? 'bg-[#7a1324] text-white border-[#7a1324]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#7a1324] hover:text-[#7a1324]'
            }`}
          >
            All
          </button>
          {yearLevels.map(yl => (
            <button
              key={yl}
              onClick={() => setFilterYearLevel(yl)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                filterYearLevel === yl
                  ? 'bg-[#7a1324] text-white border-[#7a1324]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#7a1324] hover:text-[#7a1324]'
              }`}
            >
              Year {yl}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                {['Student', 'Course / Year', 'Term', 'Balance', 'Status', ''].map(h => (
                  <th key={h} className="table-header-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">
                  No assessed students found
                  {filterCourse ? ` for ${filterCourse}` : ''}
                  {filterYearLevel ? ` Year ${filterYearLevel}` : ''}
                </td></tr>
              ) : data.map(row => {
                const assessed = Number(row.assessed_amount || 0);
                const paid = Number(row.total_paid || 0);
                const carryOverRow = Number(row.carry_over_balance || 0);
                const balance = Math.max(0, assessed - paid);
                const fullyPaid = assessed > 0 && balance <= 0;
                const st = BATCH_STATUS_LABEL[row.status] || { label: row.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };

                return (
                  <tr key={row.id} className="table-row cursor-pointer hover:bg-slate-50" onClick={() => openSoa(row)}>
                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{row.last_name}, {row.first_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{row.student_number}</div>
                    </td>
                    <td className="table-cell text-slate-600">
                      <div className="font-medium">{row.course}</div>
                      <div className="text-xs text-slate-400">Year {row.year_level}</div>
                    </td>
                    <td className="table-cell text-slate-600 text-sm">
                      <div>{row.school_year}</div>
                      <div className="text-xs text-slate-400">{row.semester} Sem</div>
                    </td>
                    <td className="table-cell">
                      {fullyPaid || (assessed === 0 && paid > 0) ? (
                        <span className="font-bold text-sm text-emerald-600 flex items-center gap-1">
                          <span className="text-[10px]">✓</span> Fully Paid
                        </span>
                      ) : assessed > 0 ? (
                        <div>
                          <span className="font-bold text-sm text-orange-600">{fmt(balance)}</span>
                          {carryOverRow > 0 && (
                            <div className="text-[10px] text-orange-400 mt-0.5">incl. {fmt(carryOverRow)} carry-over</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 italic">Not assessed</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                        onClick={e => { e.stopPropagation(); openSoa(row); }}
                      >
                        View SOA
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={soaModal.open}
        onClose={() => setSoaModal({ open: false, batch: null })}
        title="Statement of Account"
        size="md"
      >
        <SoaModal
          batch={soaModal.batch}
          onClose={() => setSoaModal({ open: false, batch: null })}
        />
      </Modal>
    </div>
  );
}

/* ─── Installment constants ─────────────────────────────────── */
const PERIODS = [
  { key: 'prelim',      label: 'Prelim' },
  { key: 'midterm',     label: 'Midterm' },
  { key: 'semi_finals', label: 'Semi-Finals' },
  { key: 'finals',      label: 'Finals' },
];

/* ─── InstallmentModal ──────────────────────────────────────── */
function InstallmentModal({ batch, onClose, onDone }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState(null); // { period }
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const assessed = Number(batch?.assessed_amount || 0);
  const carryOverInst = Number(batch?.carry_over_balance || 0);
  const perPeriod = assessed > 0 ? assessed / 4 : 0;

  const load = useCallback(async () => {
    if (!batch?.id) return;
    setLoading(true);
    try {
      const res = await client.get(`/payments/batch/${batch.id}`);
      setPayments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      toast.error('Failed to refresh payment list. Please close and reopen.');
      // do NOT clear payments — keep whatever was there
    } finally { setLoading(false); }
  }, [batch?.id]);

  useEffect(() => { load(); }, [load]);

  const verified = payments.filter(p => p.status === 'verified');
  const totalPaid = verified.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, assessed - totalPaid);

  // Per-period direct payments
  const directPeriodPaid = {};
  ['prelim', 'midterm', 'semi_finals', 'finals'].forEach(k => {
    directPeriodPaid[k] = verified.filter(p => p.payment_period === k).reduce((s, p) => s + Number(p.amount), 0);
  });

  // Generic payments without a specific installment period (cashier enrollment fee
  // or online portal payments) are applied to the earliest unpaid periods first.
  let pooledGenericPayment = verified
    .filter(p => !p.payment_period || p.payment_period === 'enrollment_fee')
    .reduce((s, p) => s + Number(p.amount), 0);
  const genericAllocated = {};
  ['prelim', 'midterm', 'semi_finals', 'finals'].forEach(k => {
    const needed = Math.max(0, perPeriod - directPeriodPaid[k]);
    const alloc = Math.min(pooledGenericPayment, needed);
    genericAllocated[k] = alloc;
    pooledGenericPayment = Math.max(0, pooledGenericPayment - alloc);
  });

  // Effective paid per period = direct payment + allocated generic payment.
  const periodPaid = (key) => directPeriodPaid[key] + (genericAllocated[key] || 0);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm) return;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await client.post('/payments/installment', {
        batch_id: batch.id,
        amount: parsedAmount,
        payment_period: payForm.period,
        notes: notes || undefined,
      });
      // optimistic: add the new payment immediately so balance updates without waiting for re-fetch
      setPayments(prev => [res.data, ...prev]);
      toast.success(`${PERIODS.find(p => p.key === payForm.period)?.label} payment recorded`);
      setPayForm(null);
      setAmount('');
      setNotes('');
      if (onDone) onDone();
      // background re-fetch to sync (don't await — don't block UX)
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-2xl bg-[#fff8eb] border border-[#f6c445]/40">
        <div>
          <p className="text-[10px] text-[#7a1324] font-bold uppercase tracking-wide mb-0.5">Student</p>
          <p className="font-bold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#7a1324] font-bold uppercase tracking-wide mb-0.5">Course / Year</p>
          <p className="font-bold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className={`grid gap-3 text-center ${carryOverInst > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500 mb-0.5">Total Tuition</p>
          <p className="font-bold text-slate-900">{assessed > 0 ? fmt(assessed) : '—'}</p>
        </div>
        {carryOverInst > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
            <p className="text-xs text-orange-600 mb-0.5">Carry-over</p>
            <p className="font-bold text-orange-700">{fmt(carryOverInst)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600 mb-0.5">Total Paid</p>
          <p className="font-bold text-emerald-700">{fmt(totalPaid)}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${balance > 0 ? 'border-orange-200 bg-orange-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className={`text-xs mb-0.5 ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>Remaining Balance</p>
          <p className={`font-bold ${balance > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>{assessed > 0 ? fmt(balance) : '—'}</p>
        </div>
      </div>

      {/* Installment schedule */}
      <div>
        <p className="font-semibold text-slate-900 text-sm mb-3">Installment Schedule</p>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-2">
            {PERIODS.map(({ key, label }) => {
              const paid = periodPaid(key);
              const due = perPeriod;
              const periodBalance = Math.max(0, due - paid);
              const isPaid = due > 0 && periodBalance <= 0;
              const periodPayments = verified.filter(p => p.payment_period === key);

              return (
                <div key={key} className={`rounded-2xl border p-4 ${isPaid ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isPaid ? '✓' : (PERIODS.findIndex(p => p.key === key) + 1)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{label}</p>
                        <p className="text-xs text-slate-500">
                          Due: {due > 0 ? fmt(due) : '—'}
                          {paid > 0 && <span className="text-emerald-600 ml-2">· Paid: {fmt(paid)}</span>}
                        </p>
                        {periodPayments.map(p => (
                          <p key={p.id} className="text-[10px] text-slate-400 mt-0.5">
                            {fmtDate(p.created_at)} — {fmt(p.amount)}{p.notes ? ` · ${p.notes}` : ''}
                          </p>
                        ))}
                        {genericAllocated[key] > 0 && (
                          <p className="text-[10px] text-violet-500 mt-0.5">
                            Enrollment or online payment applied: {fmt(genericAllocated[key])}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {isPaid ? (
                        <span className="text-xs font-bold text-emerald-600">PAID</span>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-orange-600 mb-1">{due > 0 ? fmt(periodBalance) : '—'}</p>
                          {payForm?.period !== key ? (
                            <button
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                              onClick={() => { setPayForm({ period: key }); setAmount(String(periodBalance || '')); setNotes(''); }}
                            >
                              Pay
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline payment form */}
                  {payForm?.period === key && (
                    <form onSubmit={handlePay} className="mt-3 pt-3 border-t border-slate-200 flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-28">
                        <label className="label text-xs">Amount (₱) *</label>
                        <input type="number" step="0.01" min="0.01" required className="input font-bold"
                          value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-36">
                        <label className="label text-xs">OR # / Notes</label>
                        <input type="text" className="input" placeholder="Official receipt no…"
                          value={notes} onChange={e => setNotes(e.target.value)} />
                      </div>
                      <div className="flex gap-1.5 pb-0.5">
                        <button type="button" className="btn-secondary text-xs" onClick={() => setPayForm(null)}>Cancel</button>
                        <button type="submit" className="btn-primary text-xs" disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}

            {/* Cashier enrollment fee payments */}
            {(() => {
              const enrollmentFees = verified.filter(p => p.payment_period === 'enrollment_fee');
              if (!enrollmentFees.length) return null;
              return (
                <div className="rounded-2xl border border-[#f6c445]/40 bg-[#fff8eb] p-4">
                  <p className="text-xs font-bold text-[#7a1324] uppercase tracking-wide mb-2">Enrollment Fee</p>
                  {enrollmentFees.map(p => (
                    <p key={p.id} className="text-xs text-slate-600">
                      {fmtDate(p.created_at)} — <span className="font-semibold">{fmt(p.amount)}</span>{p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  ))}
                </div>
              );
            })()}
            {/* Online payments (null period) */}
            {(() => {
              const onlinePayments = verified.filter(p => !p.payment_period);
              if (!onlinePayments.length) return null;
              return (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">Online Payments</p>
                  {onlinePayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 py-0.5">
                      <span>
                        <span className="text-violet-500 font-semibold">{METHOD_LABEL[p.payment_method] || p.payment_method}</span>
                        <span className="text-slate-400 ml-2">{fmtDate(p.created_at)}</span>
                      </span>
                      <span className="font-semibold">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ─── Walk-in Tab ────────────────────────────────────────────── */
function WalkinTab() {
  const { schoolYear, semester } = useActiveTerm();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, batch: null });
  const searchTimer = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const params = { search: q.trim(), limit: 30 };
      if (schoolYear) params.school_year = schoolYear;
      if (semester) params.semester = semester;
      const res = await client.get('/enrollment-batches/assessments', { params });
      setResults(res.data?.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [schoolYear, semester]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, doSearch]);

  const openModal = async (row) => {
    try {
      const res = await client.get(`/enrollment-batches/${row.id}`);
      setModal({ open: true, batch: res.data });
    } catch { toast.error('Failed to load student batch'); }
  };

  const BATCH_ST = {
    for_payment:      'bg-amber-50 text-amber-700 border-amber-200',
    for_registration: 'bg-blue-50 text-blue-700 border-blue-200',
    enrolled:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const BATCH_LABEL = {
    for_payment: 'For Payment', for_registration: 'For Registration', enrolled: 'Enrolled',
  };

  return (
    <div>
      <div className="mb-6 max-w-xl">
        <p className="text-sm font-semibold text-slate-700 mb-2">Search Student</p>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="input pl-9"
            placeholder="Type student name or student number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {search.trim().length > 0 && search.trim().length < 2 && (
          <p className="text-xs text-slate-400 mt-1">Type at least 2 characters to search</p>
        )}
      </div>

      {loading && (
        <div className="space-y-2 max-w-2xl">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
      )}

      {!loading && search.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl max-w-2xl">
          No enrolled students found for "{search}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 max-w-2xl">
          {results.map(row => {
            const assessed = Number(row.assessed_amount || 0);
            const paid = Number(row.total_paid || 0);
            const balance = Math.max(0, assessed - paid);
            return (
              <div key={row.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#7a1324]/30 hover:bg-[#fff8eb]/40 cursor-pointer transition-colors"
                onClick={() => openModal(row)}
              >
                <div className="w-10 h-10 rounded-full bg-[#fff8eb] border border-[#f6c445]/50 flex items-center justify-center font-bold text-[#7a1324] text-sm flex-shrink-0">
                  {row.first_name?.[0]}{row.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{row.last_name}, {row.first_name}</p>
                  <p className="text-xs text-slate-500 font-mono">{row.student_number} · {row.course} Year {row.year_level}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {(assessed === 0 && paid > 0) || (assessed > 0 && balance <= 0)
                      ? '✓ Fully Paid'
                      : assessed > 0
                        ? fmt(balance) + ' balance'
                        : 'Not assessed'}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold mt-0.5 ${BATCH_ST[row.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {BATCH_LABEL[row.status] || row.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!search.trim() && (
        <div className="text-center py-12 text-slate-400 text-sm max-w-2xl">
          <div className="text-3xl mb-3">💳</div>
          <p className="font-medium">Walk-in Installment Payment</p>
          <p className="text-xs mt-1">Search for a student above to record a Prelim, Midterm, Semi-Finals, or Finals tuition payment.</p>
        </div>
      )}

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, batch: null })}
        title="Installment Payment"
        size="lg"
      >
        <InstallmentModal
          batch={modal.batch}
          onClose={() => setModal({ open: false, batch: null })}
          onDone={() => doSearch(search)}
        />
      </Modal>
    </div>
  );
}

/* ─── CashierPaymentModal (shared) ─────────────────────────── */
function CashierPaymentModal({ batch, onClose, onDone, startCashForm = false }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showCashForm, setShowCashForm] = useState(startCashForm);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const subjects = batch?.subjects || [];
  const totalUnits = subjects.reduce((s, sub) => s + Number(sub.units || 0), 0);
  const assessedAmount = Number(batch?.assessed_amount || 0);

  useEffect(() => {
    setShowCashForm(startCashForm);
  }, [startCashForm, batch?.id]);

  const loadPayments = useCallback(async () => {
    if (!batch?.id) return;
    setLoadingPayments(true);
    try {
      const res = await client.get(`/payments/batch/${batch.id}`);
      setPayments(res.data || []);
    } catch (err) { console.error('Failed to fetch payments:', err); } finally { setLoadingPayments(false); }
  }, [batch?.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // Only count enrollment_fee payments (not prelim/midterm installments) for this tab
  const enrollmentPayments = payments.filter((p) => !p.payment_period || p.payment_period === 'enrollment_fee');
  const totalPaid = enrollmentPayments.filter((p) => p.status === 'verified').reduce((s, p) => s + Number(p.amount), 0);
  const balance = assessedAmount - totalPaid;
  const isFullyPaid = assessedAmount > 0 && balance <= 0;

  const checkEnrolled = async () => {
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      if (res.data.status === 'for_registration') {
        toast.success('Enrollment fee posted. Student moved to Registrar, and any remaining balance stays under walk-in/installment.');
        onDone();
        onClose();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const handleRecordCash = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/payments/cash', {
        batch_id: batch.id,
        amount: parseFloat(cashAmount),
        notes: cashNotes || undefined,
      });
      toast.success('Cash payment recorded');
      setShowCashForm(false);
      setCashAmount('');
      setCashNotes('');
      await loadPayments();
      await checkEnrolled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  const handleVerify = async (paymentId) => {
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/verify`);
      toast.success('Payment verified');
      await loadPayments();
      await checkEnrolled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify');
    } finally { setActionId(null); }
  };

  const handleReject = async (paymentId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/reject`, { notes: reason || undefined });
      toast.success('Payment rejected');
      await loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally { setActionId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Student</p>
          <p className="font-semibold text-slate-900">{batch?.last_name}, {batch?.first_name}</p>
          <p className="text-slate-500 font-mono text-xs">{batch?.student_number}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Course / Year</p>
          <p className="font-semibold text-slate-900">{batch?.course} — Year {batch?.year_level}</p>
          <p className="text-slate-500 text-xs">{batch?.school_year} · {batch?.semester} Sem</p>
        </div>
      </div>

      {/* Subjects */}
      {subjects.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="font-semibold text-slate-900 text-sm">Enrolled Subjects</p>
            <span className="text-xs font-bold text-slate-500">{totalUnits} units total</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subject_id} className="border-t border-slate-100 first:border-t-0">
                  <td className="px-4 py-2 font-medium text-slate-800 w-28">{s.subject_code}</td>
                  <td className="px-4 py-2 text-slate-600">{s.subject_name}</td>
                  <td className="px-4 py-2 text-right text-slate-700 font-semibold w-16">{s.units} u</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assessment summary */}
      <div className={`rounded-2xl border overflow-hidden ${isFullyPaid ? 'border-emerald-200' : 'border-orange-200'}`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isFullyPaid ? 'bg-emerald-50' : 'bg-orange-50'}`}>
          <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-900' : 'text-orange-900'}`}>Enrollment Fee Assessment</p>
          {isFullyPaid && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">FULLY PAID</span>
          )}
        </div>
        <div className="px-4 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Total Enrollment Fee</span>
            <span className="font-semibold">{assessedAmount ? fmt(assessedAmount) : <span className="text-amber-600 text-xs italic">Not set in Tuition</span>}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Paid (Verified)</span>
            <span className="font-semibold">{fmt(totalPaid)}</span>
          </div>
          <div className={`flex justify-between font-bold border-t border-slate-100 pt-2 text-base ${balance > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
            <span>Balance</span>
            <span>{fmt(Math.max(0, balance))}</span>
          </div>
        </div>
      </div>

      {/* Payment records + cash form */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-900 text-sm">Payment Records</p>
          {!showCashForm && (
            <button
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
              onClick={() => { setShowCashForm(true); setCashAmount(String(Math.max(0, balance) || '')); }}
            >
              + Record Cash Payment
            </button>
          )}
        </div>

        {showCashForm && (
          <form onSubmit={handleRecordCash} className="mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Record Cash Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Amount Paid (₱) *</label>
                <input type="number" step="0.01" min="0.01" required className="input text-lg font-bold"
                  placeholder="0.00"
                  value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">OR # / Notes</label>
                <input type="text" className="input" placeholder="Official receipt no., remarks…"
                  value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowCashForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs" disabled={saving}>
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </form>
        )}

        {loadingPayments ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : enrollmentPayments.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            No payment records yet
          </div>
        ) : (
          <div className="space-y-2">
            {enrollmentPayments.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${PAYMENT_STATUS_STYLE[p.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {p.status?.toUpperCase()}
                    </span>
                    {p.payment_period && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold bg-[#fff8eb] text-[#7a1324] border-[#f6c445]/50">
                        {PERIOD_LABEL[p.payment_period] || p.payment_period}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{METHOD_LABEL[p.payment_method] || 'Cash'}</span>
                    <span className="text-sm font-bold text-slate-900">{fmt(p.amount)}</span>
                    {p.submitted_by === 'student' && (
                      <span className="text-[10px] text-violet-500 font-semibold">via student portal</span>
                    )}
                  </div>
                  {(p.reference_number || p.xendit_invoice_id) && (
                    <p className="text-xs text-slate-400 mt-1">Ref: <span className="font-mono font-semibold text-slate-600">{p.reference_number || p.xendit_invoice_id}</span></p>
                  )}
                  {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  {p.verified_by_name && p.status !== 'pending' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.status === 'verified' ? '✓ Verified' : '✗ Rejected'} by {p.verified_by_name}</p>
                  )}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      disabled={actionId === p.id}
                      onClick={() => handleVerify(p.id)}
                    >
                      {actionId === p.id ? '…' : 'Verify'}
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
                      disabled={actionId === p.id}
                      onClick={() => handleReject(p.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ─── Main PaymentsPage ─────────────────────────────────────── */
export default function PaymentsPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const { schoolYear, semester } = useActiveTerm();

  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('queue');
  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsFilter, setRecordsFilter] = useState('pending');
  const [recordsPage, setRecordsPage] = useState(1);
  const [actionId, setActionId] = useState(null);

  const [modal, setModal] = useState({ open: false, batch: null });

  const searchTimer = useRef(null);

  /* ── queue: for_payment batches ── */
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const params = { status: 'for_payment', limit: 50 };
      if (schoolYear) params.school_year = schoolYear;
      if (semester) params.semester = semester;
      if (search.trim()) params.search = search.trim();
      const res = await client.get('/enrollment-batches', { params });
      setQueue(res.data?.data || []);
      setQueueTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load payment queue');
    } finally { setQueueLoading(false); }
  }, [schoolYear, semester, search]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadQueue, 300);
    return () => clearTimeout(searchTimer.current);
  }, [loadQueue]);

  /* ── payment records ── */
  const loadRecords = useCallback(async () => {
    if (activeTab === 'queue' || activeTab === 'assessment' || activeTab === 'walkin') return;
    setRecordsLoading(true);
    try {
      const params = { page: recordsPage, limit: 25 };
      if (recordsFilter) params.status = recordsFilter;
      if (schoolYear) params.school_year = schoolYear;
      const res = await client.get('/payments', { params });
      const fetched = res.data?.data || [];
      const safeRecords = activeTab === 'pending'
        ? fetched.filter(isManualPendingSubmission)
        : fetched;
      const filteredOutCount = fetched.length - safeRecords.length;
      setRecords(safeRecords);
      setRecordsTotal(
        activeTab === 'pending'
          ? Math.max(0, (res.data?.total || 0) - filteredOutCount)
          : (res.data?.total || 0)
      );
    } catch {
      toast.error('Failed to load records');
    } finally { setRecordsLoading(false); }
  }, [activeTab, recordsPage, recordsFilter, schoolYear]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const openModal = async (batch, options = {}) => {
    try {
      const res = await client.get(`/enrollment-batches/${batch.id}`);
      setModal({ open: true, batch: res.data, startCashForm: Boolean(options.startCashForm) });
    } catch {
      toast.error('Failed to load batch details');
    }
  };

  const recordsTotalPages = Math.ceil(recordsTotal / 25);

  const handleVerifyRecord = async (paymentId) => {
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/verify`);
      toast.success('Payment verified');
      await Promise.all([loadRecords(), loadQueue()]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify');
    } finally { setActionId(null); }
  };

  const handleRejectRecord = async (paymentId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setActionId(paymentId);
    try {
      await client.patch(`/payments/${paymentId}/reject`, { notes: reason || undefined });
      toast.success('Payment rejected');
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally { setActionId(null); }
  };

  const TABS = [
    { key: 'queue',      label: 'Enrollment Fee', count: queueTotal },
    { key: 'walkin',     label: 'Walk-in / Installment', count: null },
    { key: 'assessment', label: 'Assessment / SOA',  count: null },
    { key: 'pending',    label: 'Online Submissions', count: null },
    { key: 'history',    label: 'History',            count: null },
  ];

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments & Assessment</h1>
          <p className="page-subtitle">Enrollment fee collection and payment records</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key !== 'queue' && tab.key !== 'walkin' && tab.key !== 'assessment') {
                setRecordsFilter(tab.key === 'pending' ? 'pending' : '');
                setRecordsPage(1);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-[#7a1324] text-[#7a1324]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-[#7a1324] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="input pl-9"
                placeholder="Search student name or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setSearch('')}>Clear</button>
            )}
          </div>

          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  {['Student', 'Course / Year', 'Term', 'Enrollment Fee', 'Actions'].map((h) => (
                    <th key={h} className="table-header-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueLoading ? (
                  <tr><td colSpan={5} className="table-cell py-12 text-center text-slate-400">Loading…</td></tr>
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-cell py-12 text-center text-slate-400">
                      {search ? `No results for "${search}"` : 'No students awaiting payment'}
                    </td>
                  </tr>
                ) : queue.map((batch) => (
                  <tr key={batch.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{batch.last_name}, {batch.first_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{batch.student_number}</div>
                    </td>
                    <td className="table-cell text-slate-600">
                      <div className="font-medium">{batch.course}</div>
                      <div className="text-xs text-slate-400">Year {batch.year_level}</div>
                    </td>
                    <td className="table-cell text-slate-600 text-sm">
                      <div>{batch.school_year}</div>
                      <div className="text-xs text-slate-400">{batch.semester} Sem</div>
                    </td>
                    <td className="table-cell">
                      {batch.assessed_amount ? (
                        <span className="font-bold text-slate-900">{fmt(batch.assessed_amount)}</span>
                      ) : (
                        <span className="text-xs text-amber-600 italic">Not set</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <button
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                        onClick={() => openModal(batch, { startCashForm: true })}
                      >
                        Process Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {queueTotal > 0 && (
            <p className="mt-3 text-sm text-slate-400">{queueTotal} student(s) awaiting payment</p>
          )}
        </div>
      )}

      {/* ── WALK-IN TAB ── */}
      {activeTab === 'walkin' && <WalkinTab />}

      {/* ── ASSESSMENT TAB ── */}
      {activeTab === 'assessment' && <AssessmentTab />}

      {/* ── ONLINE SUBMISSIONS TAB ── */}
      {activeTab === 'pending' && (
        <div>
          <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              <strong>Manual verification required.</strong> Check the student's reference number against your GCash / Maya / bank inbox before clicking Confirm. Automatic detection requires a GCash merchant API — contact your system administrator to set that up.
            </span>
          </div>

          {recordsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              No pending online submissions
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(p => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-4">
                  {/* Method icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    p.payment_method === 'gcash'        ? 'bg-blue-100 text-blue-700' :
                    p.payment_method === 'maya'         ? 'bg-green-100 text-green-700' :
                    p.payment_method === 'bank_transfer'? 'bg-violet-100 text-violet-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {(METHOD_LABEL[p.payment_method] || 'Pay').slice(0,4)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-slate-900">{p.last_name}, {p.first_name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{p.student_number}</p>
                      </div>
                      <p className="font-bold text-xl text-slate-900">{fmt(p.amount)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        p.payment_method === 'gcash'         ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        p.payment_method === 'maya'          ? 'bg-green-50 text-green-700 border-green-200' :
                        p.payment_method === 'bank_transfer' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {METHOD_LABEL[p.payment_method] || p.payment_method}
                      </span>
                      {p.payment_period && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold bg-[#fff8eb] text-[#7a1324] border-[#f6c445]/50">
                          {PERIOD_LABEL[p.payment_period] || p.payment_period}
                        </span>
                      )}
                      <span>{p.school_year} · {p.semester} Sem</span>
                      <span>{new Date(p.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {p.reference_number && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Ref #:</span>
                        <span className="font-mono font-bold text-sm text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg select-all">
                          {p.reference_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                      disabled={actionId === p.id}
                      onClick={() => handleVerifyRecord(p.id)}
                    >
                      {actionId === p.id ? '…' : '✓ Confirm'}
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                      disabled={actionId === p.id}
                      onClick={() => handleRejectRecord(p.id)}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recordsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">Page {recordsPage} of {recordsTotalPages}</span>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => setRecordsPage(p => p - 1)} disabled={recordsPage === 1}>← Prev</button>
                <button className="btn-secondary text-xs" onClick={() => setRecordsPage(p => p + 1)} disabled={recordsPage === recordsTotalPages}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div>
          <div className="mb-4 flex gap-2">
            {['', 'verified', 'rejected', 'pending'].map((s) => (
              <button
                key={s}
                onClick={() => { setRecordsFilter(s); setRecordsPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  recordsFilter === s
                    ? 'bg-[#7a1324] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  {['Student', 'Term', 'Period', 'Amount', 'Method', 'Reference', 'Status'].map((h) => (
                    <th key={h} className="table-header-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr><td colSpan={7} className="table-cell py-12 text-center text-slate-400">Loading…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="table-cell py-12 text-center text-slate-400">No records found</td></tr>
                ) : records.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{p.last_name}, {p.first_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.student_number}</div>
                    </td>
                    <td className="table-cell text-slate-600 text-sm">
                      <div>{p.school_year}</div>
                      <div className="text-xs text-slate-400">{p.semester} Sem</div>
                    </td>
                    <td className="table-cell text-sm">
                      {p.payment_period
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold bg-[#fff8eb] text-[#7a1324] border-[#f6c445]/50">{PERIOD_LABEL[p.payment_period]}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="table-cell font-bold text-slate-900">{fmt(p.amount)}</td>
                    <td className="table-cell text-slate-600 text-sm">{METHOD_LABEL[p.payment_method] || '—'}</td>
                    <td className="table-cell text-slate-500 font-mono text-xs">{p.reference_number || '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${PAYMENT_STATUS_STYLE[p.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {recordsTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                <span className="text-sm text-slate-500">Page {recordsPage} of {recordsTotalPages}</span>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" onClick={() => setRecordsPage((p) => p - 1)} disabled={recordsPage === 1}>← Prev</button>
                  <button className="btn-secondary text-xs" onClick={() => setRecordsPage((p) => p + 1)} disabled={recordsPage === recordsTotalPages}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment processing modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, batch: null })}
        title="Process Enrollment Payment"
        size="lg"
      >
        <CashierPaymentModal
          batch={modal.batch}
          startCashForm={modal.startCashForm}
          onClose={() => setModal({ open: false, batch: null })}
          onDone={() => { loadQueue(); }}
        />
      </Modal>
    </div>
  );
}
