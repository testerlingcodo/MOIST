import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import MoistSeal from '../../components/branding/MoistSeal';

const STEPS = { EMAIL: 0, OTP: 1, RESET: 2, DONE: 3 };
const RESEND_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  const stopCooldown = () => {
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
    setCooldown(0);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setOtp('');
      setResetToken('');
      startCooldown();
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setOtp('');
      setResetToken('');
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/verify-otp', { email: email.trim(), otp });
      setResetToken(res.data.resetToken);
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await client.post('/auth/reset-password', {
        email: email.trim(),
        resetToken,
        newPassword: password,
      });
      stopCooldown();
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    stopCooldown();
    setStep(STEPS.EMAIL);
    setOtp('');
    setResetToken('');
    setPassword('');
    setConfirm('');
    setError('');
  };

  const stepLabels = ['Email', 'Verify OTP', 'New Password'];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg,#fff9ef 0%,#fffdf8 50%,#f7efe8 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <MoistSeal size={64} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#7a1324' }}>Reset Your Password</h1>
          <p className="text-slate-500 text-sm mt-1">
            {step === STEPS.EMAIL && 'Enter the email linked to your student account.'}
            {step === STEPS.OTP && `A 6-digit code was sent to ${email}`}
            {step === STEPS.RESET && 'Create a new secure password for your account.'}
            {step === STEPS.DONE && 'Your password has been successfully updated.'}
          </p>
        </div>

        {step < STEPS.DONE && (
          <div className="flex items-center gap-2 mb-6">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < step ? 'text-white' : i === step ? 'text-white ring-2 ring-offset-2 ring-[#7a1324]' : 'bg-slate-100 text-slate-400'
                    }`}
                    style={i <= step ? { background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' } : {}}
                  >
                    {i < step ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <p className={`text-[9px] mt-1 font-semibold ${i === step ? 'text-[#7a1324]' : i < step ? 'text-slate-500' : 'text-slate-300'}`}>
                    {label}
                  </p>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < step ? 'bg-[#7a1324]' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card">
          {step === STEPS.EMAIL && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Use the email address registered in your student account.
                </p>
              </div>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {step === STEPS.OTP && (
            <div className="space-y-5">
              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
                Check your inbox at <strong>{email}</strong> for the 6-digit code.
                The code expires in 15 minutes.
              </div>

              <div>
                <label className="label">6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input text-center text-2xl font-mono tracking-[0.6em]"
                  placeholder="------"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setError('');
                    setOtp(e.target.value.replace(/\D/g, ''));
                  }}
                />
              </div>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <button
                type="button"
                className="btn-primary w-full"
                disabled={otp.length !== 6 || loading}
                onClick={handleVerifyOtp}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-700"
                  onClick={handleChangeEmail}
                >
                  Change Email
                </button>
                <button
                  type="button"
                  className="font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                  style={{ color: '#7a1324' }}
                  onClick={handleResendOtp}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {step === STEPS.RESET && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />
                </div>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <EyeToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>
              </div>
              {password && confirm && password !== confirm && (
                <ErrorMsg>Passwords do not match.</ErrorMsg>
              )}
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || !resetToken || password !== confirm}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === STEPS.DONE && (
            <div className="text-center py-4 space-y-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(16,185,129,0.12)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5} className="w-8 h-8">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Password Updated!</p>
                <p className="text-slate-500 text-sm mt-1">You can now sign in using your new password.</p>
              </div>
              <Link to="/login" className="btn-primary inline-flex">
                Go to Sign In
              </Link>
            </div>
          )}
        </div>

        {step !== STEPS.DONE && (
          <p className="text-center text-xs text-slate-400 mt-5">
            No email on file? Contact the Registrar&apos;s Office for assistance.
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorMsg({ children }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {children}
    </div>
  );
}

function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
    >
      {show ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
