import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-PH', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : 'â€”';

function formatCountdown(expiry, now) {
  if (!expiry) return null;
  const diff = new Date(expiry).getTime() - now;
  if (diff <= 0) return 'Expired';

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${String(remMinutes).padStart(2, '0')}m`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const METHOD_LABEL = {
  cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank Transfer',
  xendit: 'Xendit', credit_card: 'Credit Card', qris: 'QRIS', ovo: 'OVO', dana: 'DANA',
};
const ONLINE_METHODS = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];
const PERIOD_LABEL = {
  enrollment_fee: 'Enrollment Fee',
  prelim:         'Prelim',
  midterm:        'Midterm',
  semi_finals:    'Semi-Finals',
  finals:         'Finals',
};
const PERIOD_COLOR = {
  enrollment_fee: 'bg-[#fff8eb] text-[#7a1324] border-[#f6c445]/50',
  prelim:         'bg-blue-50 text-blue-700 border-blue-200',
  midterm:        'bg-violet-50 text-violet-700 border-violet-200',
  semi_finals:    'bg-orange-50 text-orange-700 border-orange-200',
  finals:         'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const BATCH_STATUS_LABEL = {
  for_payment:      'For Payment',
  for_registration: 'For Registration',
  enrolled:         'Enrolled',
};

const CONVENIENCE_RATE = 0.025; // 2.5% — must match backend

/* ─── Xendit Online Pay Form ──────────────────────────────── */
function OnlinePayForm({ batch, balance, onCancel }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const assessed = Number(batch?.assessed_amount || 0);
  const base = parseFloat(amount) || 0;
  const convFee = base > 0 ? Math.ceil(base * CONVENIENCE_RATE * 100) / 100 : 0;
  const total = base + convFee;

  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const handlePay = async (e) => {
    e.preventDefault();
    if (base < 1) { toast.error('Enter an amount of at least ₱1'); return; }
    setSaving(true);
    try {
      const res = await client.post('/payments/xendit-create', {
        batch_id: batch.id,
        amount: base,
      });
      if (res.data?.reused) {
        toast('Resuming your active Xendit checkout.');
      }
      // Redirect to Xendit-hosted checkout
      window.location.href = res.data.invoiceUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create payment. Please try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="p-4 rounded-2xl border border-[#7a1324]/20 bg-[#fff8eb]/60 space-y-4">
      <p className="text-sm font-bold text-slate-800">Pay Online via Xendit</p>

      <div>
        <label className="label text-xs">Amount to Pay (₱) *</label>
        <input
          type="number" step="0.01" min="1" required className="input"
          placeholder={balance > 0 ? balance.toFixed(2) : assessed > 0 ? assessed.toFixed(2) : '0.00'}
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        {balance > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Balance due: <span className="font-semibold text-[#7a1324]">{fmt(balance)}</span>
          </p>
        )}
      </div>

      {/* Fee breakdown */}
      {base > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-sm overflow-hidden">
          <div className="flex justify-between px-4 py-2.5 text-slate-600">
            <span>Tuition Payment</span>
            <span className="font-medium">{fmt(base)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-slate-500 text-xs">
            <span>Convenience Fee (2.5%)</span>
            <span>{fmt(convFee)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 font-bold text-slate-900">
            <span>Total to Pay</span>
            <span className="text-[#7a1324]">{fmt(total)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 bg-white border border-slate-100 rounded-xl px-3 py-2">
        You will be redirected to Xendit's secure checkout. Accepted: GCash, Maya, credit/debit cards, and more.
        The payment will only appear in your official records after Xendit confirms that it was paid.
      </p>

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary text-xs" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || base < 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7a1324, #5a0d1a)' }}
        >
          {saving ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Redirecting…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Pay {base > 0 ? fmt(total) : 'Now'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─── SOA Card (one per batch) ───────────────────────────── */
function SoaCard({ batchBasic, activeTerm }) {
  const [batch,    setBatch]    = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showPay,  setShowPay]  = useState(false);
  const [now,      setNow]      = useState(() => Date.now());
  const [awaitingAction, setAwaitingAction] = useState('');
  const expiredRefreshRef = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, payRes] = await Promise.all([
        client.get(`/enrollment-batches/${batchBasic.id}`),
        client.get(`/payments/batch/${batchBasic.id}`),
      ]);
      setBatch(batchRes.data);
      setPayments(payRes.data || []);
    } catch (err) {
      console.error('Failed to load SOA:', err);
      toast.error('Failed to load account details');
    } finally { setLoading(false); }
  }, [batchBasic.id]);

  useEffect(() => { load(); }, [load]);

  const assessed   = Number(batch?.assessed_amount || 0);
  const postedPayments = (payments || []).filter((p) => p.status === 'verified');
  const totalPaid  = postedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance    = Math.max(0, assessed - totalPaid);
  const isFullyPaid = assessed > 0 && balance <= 0;
  // Only count manual pending submissions as blocking.
  const hasPending  = (payments || []).some(
    (p) => p.status === 'pending' && !p.xendit_invoice_id && p.payment_method !== 'xendit'
  );
  const activeAwaitingPayment = (payments || []).find((p) => {
    if (p.status !== 'awaiting_payment' || !p.xendit_invoice_id || !p.xendit_invoice_url) return false;
    if (!p.xendit_expires_at) return true;
    return new Date(p.xendit_expires_at).getTime() > now;
  });
  const hasAwaitingXendit = Boolean(activeAwaitingPayment);
  const xenditCountdown = formatCountdown(activeAwaitingPayment?.xendit_expires_at, now);
  const isActiveTerm = Boolean(
    activeTerm &&
    batchBasic.school_year === activeTerm.school_year &&
    batchBasic.semester === activeTerm.semester
  );
  const isClosedTerm = !isActiveTerm;
  const canPayOnline = isActiveTerm && !isFullyPaid && !hasPending &&
    ['for_payment', 'for_registration', 'enrolled'].includes(batch?.status);

  useEffect(() => {
    if (!hasAwaitingXendit) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasAwaitingXendit]);

  useEffect(() => {
    if (!activeAwaitingPayment?.id || xenditCountdown !== 'Expired') return;
    if (expiredRefreshRef.current === activeAwaitingPayment.id) return;
    expiredRefreshRef.current = activeAwaitingPayment.id;
    load();
  }, [activeAwaitingPayment?.id, xenditCountdown, load]);

  const handleContinueXendit = () => {
    if (isClosedTerm) {
      toast.error('This term is already closed. Any remaining balance will carry over to the next active term.');
      return;
    }
    if (!activeAwaitingPayment?.xendit_invoice_url) {
      toast.error('No active Xendit checkout found.');
      return;
    }
    window.location.href = activeAwaitingPayment.xendit_invoice_url;
  };

  const handleStartNewPayment = async () => {
    if (isClosedTerm) {
      toast.error('This term is already closed. Any remaining balance will carry over to the next active term.');
      return;
    }
    if (!activeAwaitingPayment?.id) {
      setShowPay(true);
      return;
    }

    setAwaitingAction('restart');
    try {
      await client.patch(`/payments/${activeAwaitingPayment.id}/xendit-cancel`);
      toast.success('Previous Xendit checkout cancelled. You can start a new payment now.');
      await load();
      setShowPay(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not reset the previous checkout.');
    } finally {
      setAwaitingAction('');
    }
  };

  const statusLabel = BATCH_STATUS_LABEL[batchBasic.status] || batchBasic.status;
  const statusCls = {
    for_payment:      'bg-amber-50 text-amber-700 border-amber-200',
    for_registration: 'bg-blue-50 text-blue-700 border-blue-200',
    enrolled:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[batchBasic.status] || 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">
            {batchBasic.school_year} — {batchBasic.semester} Semester
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{batchBasic.course} · Year {batchBasic.year_level}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${statusCls}`}>
            {statusLabel}
          </span>
          {isFullyPaid && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              FULLY PAID
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>
          <div className="h-14 bg-slate-100 rounded-xl animate-pulse w-3/4"/>
        </div>
      ) : (
        <>
          {/* Assessment summary */}
          <div className={`rounded-2xl border overflow-hidden ${isFullyPaid ? 'border-emerald-200' : assessed > 0 ? 'border-orange-200' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 border-b ${isFullyPaid ? 'bg-emerald-50 border-emerald-200' : assessed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-900' : assessed > 0 ? 'text-orange-900' : 'text-slate-700'}`}>
                Assessment
              </p>
            </div>
            <div className="px-4 py-4 space-y-2 text-sm">
              {assessed > 0 ? (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Total Tuition Fee</span>
                    <span className="font-semibold">{fmt(assessed)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Paid</span>
                    <span className="font-semibold">{fmt(totalPaid)}</span>
                  </div>
                  <div className={`flex justify-between font-bold border-t border-slate-100 pt-2 text-base ${balance > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                    <span>Remaining Balance</span>
                    <span>{balance > 0 ? fmt(balance) : '₱0.00'}</span>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm italic py-1">
                  Assessment not yet set. Visit the Cashier's Office for details.
                </p>
              )}
            </div>
          </div>

          {isClosedTerm && balance > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              This term is already closed. Online payment is disabled here, and the remaining balance will carry over to your next active term.
            </div>
          )}

          {/* Pay online prompt */}
          {canPayOnline && !showPay && !hasAwaitingXendit && (
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#7a1324]/30 text-[#7a1324] font-semibold text-sm hover:border-[#7a1324] hover:bg-[#fff8eb]/60 transition-colors"
              onClick={() => setShowPay(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Pay Online
            </button>
          )}

          {hasPending && !isFullyPaid && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              You have a pending payment awaiting cashier verification.
            </div>
          )}

          {hasAwaitingXendit && !isFullyPaid && (
            <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/>
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <span>You have an incomplete Xendit checkout. It has not been sent to the cashier for manual verification.</span>
              </div>
              {activeAwaitingPayment?.xendit_expires_at && (
                <div className="rounded-lg bg-white/70 border border-blue-100 px-3 py-2 space-y-1">
                  <p>
                    Expires at: <span className="font-semibold">{fmtDateTime(activeAwaitingPayment.xendit_expires_at)}</span>
                  </p>
                  <p>
                    Time left: <span className="font-semibold">{xenditCountdown || 'Calculating…'}</span>
                  </p>
                </div>
              )}
              <p className="text-blue-600">If you already paid, it will appear automatically once Xendit confirms it.</p>
              {!isClosedTerm && <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  onClick={handleContinueXendit}
                  disabled={awaitingAction === 'restart'}
                >
                  Continue Payment
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-blue-700 disabled:opacity-60"
                  onClick={handleStartNewPayment}
                  disabled={awaitingAction === 'restart'}
                >
                  {awaitingAction === 'restart' ? 'Resettingâ€¦' : 'Start New Payment'}
                </button>
              </div>}
            </div>
          )}

          {showPay && (
            <OnlinePayForm
              batch={batch}
              balance={balance}
              onCancel={() => setShowPay(false)}
            />
          )}

          {/* Payment records */}
          <div>
            <p className="font-semibold text-slate-800 text-sm mb-3">Payment Records</p>
            {postedPayments.length === 0 ? (
              <div className="text-center py-5 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                No payment records yet
              </div>
            ) : (
              <div className="space-y-2">
                {postedPayments.map(p => {
                  const isXenditRecord = Boolean(p.xendit_invoice_id) || p.payment_method === 'xendit';
                  return (
                  <div key={p.id} className={`rounded-xl border px-4 py-3 text-sm ${
                    p.status === 'verified' ? 'bg-emerald-50 border-emerald-200' :
                    p.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    p.status === 'failed' ? 'bg-red-50 border-red-200' :
                    p.status === 'cancelled' ? 'bg-slate-50 border-slate-200' :
                    'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            PERIOD_COLOR[p.payment_period] || 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {PERIOD_LABEL[p.payment_period] || '—'}
                          </span>
                          <span className="font-bold text-base text-slate-900">{fmt(p.amount)}</span>
                          <span className="text-xs text-slate-500">{METHOD_LABEL[p.payment_method] || p.payment_method || 'Cash'}</span>
                          {p.submitted_by === 'cashier' && (
                            <span className="text-[10px] text-slate-400 italic">recorded by cashier</span>
                          )}
                          {isXenditRecord ? (
                            <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">Online</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{fmtDate(p.created_at)}</p>
                        {(p.reference_number || p.xendit_invoice_id) && (
                          <p className="text-xs text-slate-500 mt-0.5">Ref: <span className="font-mono font-semibold">{p.reference_number || p.xendit_invoice_id}</span></p>
                        )}
                        {p.status === 'awaiting_payment' && p.xendit_expires_at && (
                          <p className="text-xs mt-1 text-blue-600">
                            Expires at {fmtDateTime(p.xendit_expires_at)}
                          </p>
                        )}
                        {p.status === 'pending' && !isXenditRecord && (
                          <p className="text-xs mt-1 text-amber-600 flex items-center gap-1">
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/>
                              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            Awaiting cashier verification…
                          </p>
                        )}
                        {p.status === 'awaiting_payment' && isXenditRecord && (
                          <p className="text-xs mt-1 text-blue-600 flex items-center gap-1">
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/>
                              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            Waiting for Xendit payment confirmation…
                          </p>
                        )}
                        {p.status === 'verified' && (
                          <p className="text-xs mt-1 text-emerald-600">✓ Payment confirmed by cashier</p>
                        )}
                        {p.status === 'failed' && (
                          <p className="text-xs mt-1 text-red-600">Payment failed or the Xendit checkout expired. This was not sent to cashier verification.</p>
                        )}
                        {p.status === 'cancelled' && (
                          <p className="text-xs mt-1 text-slate-600">Checkout cancelled. This was not sent to cashier verification.</p>
                        )}
                        {p.status === 'rejected' && p.notes && (
                          <p className="text-xs mt-1 font-medium text-red-600">Reason: {p.notes}</p>
                        )}
                      </div>
                      {p.status === 'verified' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} className="w-5 h-5 flex-shrink-0 mt-0.5">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>

          {/* Paying in person info */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
            <strong>Paying in person?</strong> You may also pay directly at the <strong>Cashier's Office</strong>. Bring your reference number or OR.
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function StudentPaymentsPage() {
  const { user } = useSelector(s => s.auth);
  const [batches,  setBatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [activeTerm, setActiveTerm] = useState(null);

  const termKey = (batch) => `${batch.school_year}__${batch.semester}`;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get('/enrollment-batches', { params: { limit: 50 } }),
      client.get('/academic-settings/active').catch(() => ({ data: null })),
    ])
      .then(([batchRes, termRes]) => {
        const all = (batchRes.data?.data || []).filter(b =>
          ['for_payment', 'for_registration', 'enrolled'].includes(b.status)
        );
        setBatches(all);
        setActiveTerm(termRes.data || null);
      })
      .catch(() => toast.error('Failed to load account records'))
      .finally(() => setLoading(false));
  }, [user]);

  const termOptions = batches.map((batch) => ({
    key: termKey(batch),
    label: `${batch.school_year} - ${batch.semester} Semester`,
  })).filter((option, index, array) => array.findIndex((item) => item.key === option.key) === index);

  const visibleBatches = selectedTerm
    ? batches.filter((batch) => termKey(batch) === selectedTerm)
    : batches;

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="page-title">My Statement of Account</h1>
        <p className="page-subtitle">View your tuition assessment and payment records</p>
      </div>

      {!loading && termOptions.length > 0 && (
        <div className="card mb-5 flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Payment History</p>
            <p className="text-xs text-slate-500">Choose a term to view current or previous semester records.</p>
          </div>
          <select
            className="input max-w-sm"
            value={selectedTerm}
            onChange={(event) => setSelectedTerm(event.target.value)}
          >
            <option value="">All Terms</option>
            {termOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="card space-y-4 animate-pulse">
              <div className="h-5 bg-slate-100 rounded-xl w-1/3"/>
              <div className="h-20 bg-slate-100 rounded-2xl"/>
              <div className="h-14 bg-slate-100 rounded-xl w-2/3"/>
            </div>
          ))}
        </div>
      ) : visibleBatches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(122,19,36,0.07)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={1.5} className="w-7 h-7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p className="text-slate-500 font-medium text-sm">No account records found</p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedTerm
              ? 'No payment records found for the selected term.'
              : 'Your SOA will appear here once your enrollment is approved and assessed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleBatches.map(b => <SoaCard key={b.id} batchBasic={b} activeTerm={activeTerm} />)}
        </div>
      )}
    </div>
  );
}
