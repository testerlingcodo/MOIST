import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const STATUS_META = {
  for_subject_enrollment: { label: 'Under Evaluation',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  for_assessment:         { label: 'For Approval',        cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  for_payment:            { label: 'For Payment',         cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  for_registration:       { label: 'For Registration',    cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  enrolled:               { label: 'Officially Enrolled', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const STEPS = [
  {
    key: 'submitted',
    label: 'Submitted',
    desc: 'Your enrollment request has been received and is being processed.',
  },
  {
    key: 'for_subject_enrollment',
    label: 'Evaluation',
    desc: 'The Dean is reviewing your request and will assign your final subjects.',
  },
  {
    key: 'for_assessment',
    label: 'Approval',
    desc: 'Subjects finalized. The Registrar will review and approve your enrollment.',
  },
  {
    key: 'for_payment',
    label: 'Payment',
    desc: 'Approved! Please proceed to the Cashier\'s Office to settle your tuition fees.',
  },
  {
    key: 'for_registration',
    label: 'Registration',
    desc: 'Payment received! Please go to the Registrar\'s Office with your payment receipt to be officially enrolled.',
  },
  {
    key: 'enrolled',
    label: 'Enrolled',
    desc: 'Congratulations! You are officially enrolled. Your enrollment slip has been issued by the Registrar.',
  },
];

const STATUS_TO_STEP = {
  for_subject_enrollment: 1,
  for_assessment:         2,
  for_payment:            3,
  for_registration:       4,
  enrolled:               5,
};

function StepTracker({ status }) {
  const isEnrolled = status === 'enrolled';
  const currentIdx = STATUS_TO_STEP[status] ?? 1;
  const currentStep = STEPS[currentIdx];

  return (
    <div className="mb-2">
      <div className="flex items-start gap-0">
        {STEPS.map((step, i) => {
          const done = isEnrolled || i < currentIdx;
          const active = !isEnrolled && i === currentIdx;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  {active && (
                    <span className="absolute inline-flex h-9 w-9 rounded-full opacity-25 animate-ping"
                      style={{ background: '#7a1324' }} />
                  )}
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    done   ? 'text-white' :
                    active ? 'text-white ring-2 ring-offset-2 ring-[#7a1324]' :
                    'bg-slate-100 text-slate-400'
                  }`}
                    style={(done || active) ? { background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' } : {}}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-4 h-4">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : active ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                </div>

                <p className={`text-[10px] mt-1.5 font-semibold text-center w-16 leading-tight ${
                  active ? 'text-[#7a1324]' : done ? 'text-slate-500' : 'text-slate-300'
                }`}>
                  {step.label}
                </p>
              </div>

              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-6 transition-all ${
                  done ? 'bg-[#7a1324]' : 'bg-slate-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {isEnrolled ? (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} className="w-4 h-4 mt-0.5 flex-shrink-0">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <div>
            <p className="text-xs font-bold text-emerald-700">Officially Enrolled</p>
            <p className="text-xs text-emerald-600 mt-0.5">{STEPS[STEPS.length - 1].desc}</p>
          </div>
        </div>
      ) : currentStep && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(122,19,36,0.03)', borderColor: 'rgba(122,19,36,0.12)' }}>
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse"
            style={{ background: '#7a1324' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: '#7a1324' }}>
              Currently: {currentStep.label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{currentStep.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}


const ONLINE_METHODS = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const PAYMENT_STATUS_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const METHOD_LABEL_STUDENT = { cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank Transfer' };

function PaymentSection({ batch, onEnrolled, readOnly = false }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState('gcash');
  const [refNumber, setRefNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assessedAmount = Number(batch?.assessed_amount || 0);
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const loadPayments = useCallback(async () => {
    if (!batch?.id) return;
    setLoadingPayments(true);
    try {
      const res = await client.get(`/payments/batch/${batch.id}`);
      setPayments(res.data || []);
    } catch { setPayments([]); }
    finally { setLoadingPayments(false); }
  }, [batch?.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const verifiedPayments = payments.filter((p) => p.status === 'verified');
  const postedPayments = verifiedPayments;
  const totalPaid = postedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, assessedAmount - totalPaid);
  const isFullyPaid = assessedAmount > 0 && balance <= 0;
  const hasPending = payments.some((p) => p.status === 'pending');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!refNumber.trim()) { toast.error('Please enter a reference number'); return; }
    setSubmitting(true);
    try {
      await client.post('/payments/online', {
        batch_id: batch.id,
        amount: parseFloat(amount) || assessedAmount,
        payment_method: method,
        reference_number: refNumber.trim(),
      });
      toast.success('Payment submitted! Please wait for cashier verification.');
      setShowForm(false);
      setRefNumber('');
      await loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const openForm = (prefill = {}) => {
    setMethod(prefill.method || 'gcash');
    setAmount(prefill.amount || String(balance || assessedAmount || ''));
    setRefNumber('');
    setShowForm(true);
  };

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Assessment & Payment</h2>
        {isFullyPaid && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            FULLY PAID
          </span>
        )}
      </div>

      {/* Fee summary card */}
      <div className={`rounded-2xl border overflow-hidden ${isFullyPaid ? 'border-emerald-200' : 'border-orange-200'}`}>
        <div className={`px-4 py-3 border-b ${isFullyPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-900' : 'text-orange-900'}`}>Enrollment Fee</p>
          <p className={`text-xs mt-0.5 ${isFullyPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
            {batch.school_year} · {batch.semester} Semester
          </p>
        </div>
        <div className="px-4 py-4 space-y-2.5 text-sm">
          {assessedAmount > 0 ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>Total Assessment</span>
                <span className="font-semibold">{fmt(assessedAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid (Verified)</span>
                <span className="font-semibold">{fmt(totalPaid)}</span>
              </div>
              {!isFullyPaid && (
                <div className="flex justify-between font-bold text-orange-700 border-t border-orange-100 pt-2">
                  <span>Balance Remaining</span>
                  <span>{fmt(balance)}</span>
                </div>
              )}
              {isFullyPaid && (
                <div className="flex justify-between font-bold text-emerald-700 border-t border-emerald-100 pt-2">
                  <span>Balance</span>
                  <span>₱0.00</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-sm italic py-1">Assessment not yet set. Visit the Cashier's Office for details.</p>
          )}
        </div>
      </div>

      {/* Payment records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-800 text-sm">Payment Records</p>
          {!readOnly && !showForm && !hasPending && !isFullyPaid && (
            <button
              className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg,#7a1324,#a32639)' }}
              onClick={() => openForm()}
            >
              + Pay Online
            </button>
          )}
        </div>

        {!readOnly && showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
            <p className="text-sm font-semibold text-slate-800">Submit Online Payment Proof</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Payment Method *</label>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {ONLINE_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Amount (₱) *</label>
                <input type="number" step="0.01" min="1" required className="input"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label text-xs">Reference / Confirmation Number *</label>
              <input type="text" required className="input"
                placeholder="e.g. GCash ref 1234567890"
                value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
            </div>
            <p className="text-xs text-slate-400 bg-white border border-slate-100 rounded-xl px-3 py-2">
              <strong className="text-slate-600">Note:</strong> The cashier will verify your payment. You will be officially enrolled once it is confirmed.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Submitting…
                  </span>
                ) : 'Submit Payment'}
              </button>
            </div>
          </form>
        )}

        {loadingPayments ? (
          <div className="space-y-2">
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse w-3/4" />
          </div>
        ) : postedPayments.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            {readOnly ? 'No payment records found.' : (
              <>No submissions yet.<br /><span className="text-xs">Click "Pay Online" or visit the Cashier's Office.</span></>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {postedPayments.map((p) => {
              const isVerified = p.status === 'verified';
              const isRejected = p.status === 'rejected';
              return (
                <div key={p.id} className={`rounded-xl border px-4 py-3 text-sm ${PAYMENT_STATUS_STYLE[p.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs uppercase tracking-wide opacity-75">{p.status}</span>
                        <span className="font-bold text-base">{fmt(p.amount)}</span>
                        <span className="text-xs opacity-70">{METHOD_LABEL_STUDENT[p.payment_method] || p.payment_method || 'Cash'}</span>
                        {p.submitted_by === 'cashier' && (
                          <span className="text-[10px] opacity-60 italic">recorded by cashier</span>
                        )}
                      </div>
                      {p.reference_number && (
                        <p className="text-xs mt-1 opacity-75">Ref: <span className="font-mono font-semibold">{p.reference_number}</span></p>
                      )}
                      {false && (
                        <p className="text-xs mt-1.5 opacity-75 flex items-center gap-1">
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/>
                            <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                          Awaiting cashier verification…
                        </p>
                      )}
                      {isVerified && (
                        <p className="text-xs mt-1 opacity-75">✓ Payment confirmed by cashier</p>
                      )}
                      {isRejected && p.notes && (
                        <p className="text-xs mt-1 font-medium">Reason: {p.notes}</p>
                      )}
                    </div>
                    {isVerified && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 flex-shrink-0 opacity-60">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    )}
                  </div>
                  {!readOnly && isRejected && (
                    <button
                      className="mt-2.5 text-xs font-semibold underline underline-offset-2"
                      onClick={() => openForm({ method: p.payment_method, amount: String(p.amount) })}
                    >
                      Resubmit with correct info →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
          <strong>Paying in person?</strong> You may also pay directly at the <strong>Cashier's Office</strong>. Your enrollment will be processed on the spot.
        </div>
      )}
    </div>
  );
}

function PreEnrollForm({ activeTerm, studentId, onEnrolled }) {
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [studentRes, subjectsRes] = await Promise.all([
          client.get(`/students/${studentId}`),
          client.get('/enrollment-batches/pre-enrollment-subjects'),
        ]);
        if (!active) return;
        setStudent(studentRes.data);
        const filtered = [
          ...(subjectsRes.data?.regular || []),
          ...(subjectsRes.data?.retakes || []),
        ].filter(
          (sub) => sub.semester === activeTerm.semester
        );
        setAvailableSubjects(filtered);
        setSelectedIds(filtered.map((sub) => String(sub.id)));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load subjects');
      } finally {
        if (active) setLoadingSubjects(false);
      }
    }
    load();
    return () => { active = false; };
  }, [studentId, activeTerm.semester]);

  const toggle = (id) => setSelectedIds((cur) =>
    cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) { toast.error('Please select at least one subject'); return; }
    setSubmitting(true);
    try {
      await client.post('/enrollment-batches', {
        school_year: activeTerm.school_year,
        semester: activeTerm.semester,
        subject_ids: selectedIds,
      });
      toast.success('Enrollment submitted! The Dean will review your subjects.');
      // Brief pause so the spinner is visible before reloading
      await new Promise((r) => setTimeout(r, 800));
      onEnrolled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Pre-enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSubjects) {
    return <div className="py-8 text-center text-slate-400 text-sm">Loading available subjects…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">School Year</p>
          <p className="font-semibold text-slate-800">{activeTerm.school_year}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Semester</p>
          <p className="font-semibold text-slate-800">{activeTerm.semester}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Course / Year</p>
          <p className="font-semibold text-slate-800">{student?.course} — Year {student?.year_level}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Select Subjects for Pre-Enrollment</label>
          <span className="text-xs text-slate-400">{selectedIds.length} selected</span>
        </div>

        {availableSubjects.length === 0 ? (
          <div className="px-4 py-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            No eligible subject offerings found for your active semester yet. Please contact the Registrar.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            {availableSubjects.map((s) => {
              const sid = String(s.id);
              const checked = selectedIds.includes(sid);
              return (
                <label key={s.id}
                  className={`flex items-start gap-3 px-4 py-3 border-t first:border-t-0 border-slate-100 cursor-pointer transition-colors ${
                    checked ? 'bg-[#7a1324]/5' : 'hover:bg-slate-50'
                  }`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(sid)} className="mt-0.5 accent-[#7a1324]" />
                  <div className="min-w-0 flex-1">
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.is_failed && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          Failed Retake
                        </span>
                      )}
                      {!s.is_failed && s.is_retake && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Backlog Subject
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{s.code} — {s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.units} units
                      {s.section_name ? ` · Section ${s.section_name}` : ''}
                      {s.schedule_days ? ` · ${s.schedule_days}` : ''}
                      {s.start_time && s.end_time ? ` · ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}` : ''}
                      {s.room ? ` · ${s.room}` : ''}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 border border-slate-100 rounded-xl px-4 py-3 bg-slate-50">
        <strong className="text-slate-600">Note:</strong> Your selection is for pre-enrollment only.
        The Dean will review and assign your final subjects during evaluation.
      </p>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={submitting || availableSubjects.length === 0}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Processing…
            </span>
          ) : 'Submit Pre-Enrollment'}
        </button>
      </div>
    </form>
  );
}

export default function EnrollmentPage() {
  const { user } = useSelector((s) => s.auth);
  const [activeTerm, setActiveTerm] = useState(null);
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const termRes = await client.get('/academic-settings/active');
      setActiveTerm(termRes.data);

      if (termRes.data) {
        const batchRes = await client.get('/enrollment-batches', {
          params: {
            school_year: termRes.data.school_year,
            semester: termRes.data.semester,
            limit: 1,
          },
        });
        const basic = batchRes.data?.data?.[0] || null;
        if (basic) {
          const fullRes = await client.get(`/enrollment-batches/${basic.id}`);
          setBatch(fullRes.data);
        } else {
          setBatch(null);
        }
      } else {
        setBatch(null);
      }
    } catch {
      toast.error('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusMeta = batch ? (STATUS_META[batch.status] || { label: batch.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }) : null;

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="page-title">My Enrollment</h1>
        <p className="page-subtitle">
          {activeTerm ? `${activeTerm.school_year} — ${activeTerm.semester} Semester` : 'No active term'}
        </p>
      </div>

      {loading ? (
        <div className="card animate-pulse space-y-4">
          <div className="h-5 bg-slate-100 rounded-xl w-1/3" />
          <div className="h-4 bg-slate-100 rounded-xl w-1/2" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      ) : !activeTerm ? (
        <div className="card text-center py-10">
          <p className="text-slate-400 text-sm">No active academic term. Please contact the Registrar's Office.</p>
        </div>
      ) : !batch ? (
        <div className="card">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 text-lg">
              Pre-Enroll for {activeTerm.school_year} — {activeTerm.semester} Semester
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select your subjects. Your request will go directly to the Dean for evaluation.
            </p>
          </div>
          <PreEnrollForm activeTerm={activeTerm} studentId={user.studentId} onEnrolled={load} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Enrollment Application</h2>
              <div className="flex items-center gap-2">
                {batch.status === 'for_registration' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold">
                    Proceed to Registrar's Office
                  </span>
                )}
                {statusMeta && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${statusMeta.cls}`}>
                    {statusMeta.label}
                  </span>
                )}
              </div>
            </div>

            {batch.status === 'pending' ? (
              /* Legacy pending — shouldn't happen for new batches */
              <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <p className="text-sm text-amber-700 font-medium">Pending — waiting for processing by the Registrar.</p>
              </div>
            ) : (
              <StepTracker status={batch.status} />
            )}

            <div className="grid grid-cols-1 gap-3 mt-4 p-3 bg-slate-50 rounded-xl text-sm sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">School Year</p>
                <p className="font-semibold text-slate-800">{batch.school_year}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Semester</p>
                <p className="font-semibold text-slate-800">{batch.semester}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Subjects</p>
                <p className="font-semibold text-slate-800">{batch.subjects?.length ?? '—'}</p>
              </div>
            </div>

            {batch.dean_notes && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-0.5">Dean's Notes</p>
                <p className="text-sm text-blue-800">{batch.dean_notes}</p>
              </div>
            )}
          </div>

          {/* Subjects table */}
          {batch.subjects?.length > 0 && (
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Code', 'Subject', 'Units', 'Section', 'Day', 'Time', 'Room'].map((h) => (
                      <th key={h} className="table-header-cell">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batch.subjects.map((s) => (
                    <tr key={s.subject_id} className="table-row">
                      <td className="table-cell font-mono text-xs text-slate-600">{s.subject_code}</td>
                      <td className="table-cell font-semibold text-slate-900">{s.subject_name}</td>
                      <td className="table-cell text-slate-600">{s.units}</td>
                      <td className="table-cell text-slate-500">{s.section_name || '—'}</td>
                      <td className="table-cell text-slate-500 text-xs">{s.schedule_days || '—'}</td>
                      <td className="table-cell text-slate-500 text-xs">
                        {s.start_time && s.end_time ? `${fmtTime(s.start_time)}–${fmtTime(s.end_time)}` : '—'}
                      </td>
                      <td className="table-cell text-slate-500">{s.room || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(batch.status === 'for_payment' || batch.status === 'for_registration' || batch.status === 'enrolled') && (
            <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Payments Moved</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Assessment and payment details are now available in My Payments / SOA.
                </p>
              </div>
              <Link
                to="/payments"
                className="btn-primary text-xs sm:text-sm"
              >
                Open My Payments / SOA
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
