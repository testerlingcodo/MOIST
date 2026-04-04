import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';

const fmt = (n) => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function getFailureMeta(status) {
  switch (status) {
    case 'failed':
      return {
        title: 'Payment Failed',
        accent: 'text-red-600',
        panel: 'bg-red-50 border-red-200 text-red-800',
        body: 'The Xendit checkout expired or did not complete successfully. This payment was not sent to cashier verification.',
      };
    case 'cancelled':
      return {
        title: 'Payment Cancelled',
        accent: 'text-amber-600',
        panel: 'bg-amber-50 border-amber-200 text-amber-800',
        body: 'This checkout was cancelled and was not submitted as a valid payment.',
      };
    case 'verified':
      return {
        title: 'Payment Confirmed',
        accent: 'text-emerald-600',
        panel: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        body: 'This payment was already confirmed successfully.',
      };
    default:
      return {
        title: 'Checkout Not Completed',
        accent: 'text-blue-600',
        panel: 'bg-blue-50 border-blue-200 text-blue-800',
        body: 'The checkout was not completed yet. It is not posted to cashier verification unless Xendit confirms payment.',
      };
  }
}

export default function PaymentFailedPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref || !accessToken || user?.role !== 'student') {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const res = await client.get(`/payments/${ref}`);
        if (!active) return;

        if (res.data?.status === 'verified') {
          navigate(`/payment-success?ref=${ref}`, { replace: true });
          return;
        }

        setPayment(res.data);
      } catch {
        // keep generic fallback state
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [accessToken, navigate, ref, user?.role]);

  const meta = getFailureMeta(payment?.status);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #7a1324 0%, #5a0d1a 50%, #3a0810 100%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div
            className="flex items-center justify-center gap-3 px-6 py-5"
            style={{ background: 'linear-gradient(135deg, #7a1324, #5a0d1a)' }}
          >
            <img
              src="/moist-seal.png"
              alt="MOIST"
              className="w-12 h-12 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <p className="text-white font-black text-sm leading-tight">MOIST, INC.</p>
              <p className="text-white/70 text-[10px] leading-tight">Misamis Oriental Institute of Science and Technology</p>
            </div>
          </div>

          <div className="px-6 py-8 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2.5} className="w-10 h-10">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9 9 15" />
                <path d="M9 9l6 6" />
              </svg>
            </div>

            <h1 className={`text-xl font-black mb-1 ${meta.accent}`}>{meta.title}</h1>
            <p className="text-sm text-slate-500 mb-6">
              This checkout did not finish as a valid posted payment.
            </p>

            {!loading && payment && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left space-y-2 mb-6 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Amount</span>
                  <span className="font-bold text-slate-900">{fmt(payment.amount)}</span>
                </div>
                {Number(payment.convenience_fee) > 0 && (
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>Convenience Fee</span>
                    <span>{fmt(payment.convenience_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Status</span>
                  <span className={`font-bold ${meta.accent}`}>{payment.status}</span>
                </div>
                {payment.xendit_invoice_id && (
                  <div className="flex justify-between text-slate-500 text-xs pt-1 border-t border-slate-200">
                    <span>Reference</span>
                    <span className="font-mono">{payment.xendit_invoice_id.slice(-12)}</span>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 mb-6 flex justify-center">
                <svg className="animate-spin w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            )}

            <div className={`rounded-xl border px-4 py-3 text-xs text-left mb-6 ${meta.panel}`}>
              <strong>Security note:</strong> {meta.body}
            </div>

            <button
              onClick={() => navigate('/payments')}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #7a1324, #5a0d1a)' }}
            >
              Back to My Payments
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">
          (c) {new Date().getFullYear()} MOIST, Inc. - Student Information System
        </p>
      </div>
    </div>
  );
}
