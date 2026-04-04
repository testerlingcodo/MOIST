import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

const fmt = (n) => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function getPaymentStatusMeta(status) {
  switch (status) {
    case 'verified':
      return {
        label: 'Confirmed',
        cls: 'text-emerald-600',
        nextStep: 'Your payment was confirmed and your enrollment will update automatically.',
      };
    case 'awaiting_payment':
      return {
        label: 'Finalizing with Xendit',
        cls: 'text-blue-600',
        nextStep: 'Your payment redirect was received. Please wait while we confirm the final result from Xendit.',
      };
    case 'pending':
      return {
        label: 'Pending Cashier Verification',
        cls: 'text-amber-600',
        nextStep: 'The cashier still needs to verify this manual online submission.',
      };
    case 'failed':
    case 'cancelled':
      return {
        label: 'Not Completed',
        cls: 'text-red-600',
        nextStep: 'This checkout was not completed, so it was not sent for cashier verification.',
      };
    default:
      return {
        label: status || 'Processing',
        cls: 'text-slate-600',
        nextStep: 'Please check My Payments again in a moment.',
      };
  }
}

export default function PaymentSuccessPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const statusMeta = getPaymentStatusMeta(payment?.status);

  useEffect(() => {
    if (!ref || !accessToken || user?.role !== 'student') {
      setLoading(false);
      return;
    }

    let active = true;
    let attempts = 0;
    let timer = null;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await client.get(`/payments/${ref}`);
        if (!active) return;

        setPayment(res.data);

        if (res.data?.status === 'verified') {
          setLoading(false);
          return;
        }

        if (res.data?.status === 'failed' || res.data?.status === 'cancelled') {
          setLoading(false);
          navigate(`/payment-failed?ref=${ref}`, { replace: true });
          return;
        }

        if (attempts < 8) {
          timer = setTimeout(poll, 2000);
          return;
        }
      } catch {
        if (active && attempts < 8) {
          timer = setTimeout(poll, 2000);
          return;
        }
      }

      if (active) setLoading(false);
    };

    timer = setTimeout(poll, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [accessToken, navigate, ref, user?.role]);

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
              style={{ background: payment?.status === 'verified' ? 'rgba(5,150,105,0.1)' : 'rgba(37,99,235,0.1)' }}
            >
              {payment?.status === 'verified' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} className="w-10 h-10">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg className="animate-spin w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
            </div>

            <h1 className="text-xl font-black text-slate-900 mb-1">
              {payment?.status === 'verified' ? 'Payment Received!' : 'Processing Payment'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {payment?.status === 'verified'
                ? 'Your payment has been submitted successfully.'
                : 'We are checking the final payment result from Xendit.'}
            </p>

            {!loading && payment && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left space-y-2 mb-6 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span className="font-bold text-slate-900">{fmt(payment.amount)}</span>
                </div>
                {Number(payment.convenience_fee) > 0 && (
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>Convenience Fee</span>
                    <span>{fmt(payment.convenience_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Term</span>
                  <span className="font-medium text-slate-800">
                    {payment.school_year} - {payment.semester} Sem
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status</span>
                  <span className={`font-bold ${statusMeta.cls}`}>{statusMeta.label}</span>
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

            <div className={`${payment?.status === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'} rounded-xl border px-4 py-3 text-xs text-left mb-6`}>
              <strong>{payment?.status === 'verified' ? 'Confirmed:' : 'What happens next?'}</strong> {statusMeta.nextStep}
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
