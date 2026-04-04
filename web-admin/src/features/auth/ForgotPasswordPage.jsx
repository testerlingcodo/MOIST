import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const STEPS = { EMAIL: 0, OTP: 1, RESET: 2, DONE: 3 };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/forgot-password', { email });
      if (res.data.otp) setDevOtp(res.data.otp);
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { email, otp, newPassword: password });
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 text-sm mt-1">
            {step === STEPS.EMAIL && 'Enter your email to receive a verification code'}
            {step === STEPS.OTP && 'Enter the OTP sent to your email'}
            {step === STEPS.RESET && 'Create your new password'}
            {step === STEPS.DONE && 'Your password has been reset'}
          </p>
        </div>

        {/* Progress bar */}
        {step < STEPS.DONE && (
          <div className="flex gap-1.5 mb-8">
            {[STEPS.EMAIL, STEPS.OTP, STEPS.RESET].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`}
              />
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
                  required
                />
              </div>
              {error && <p className="field-error">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {step === STEPS.OTP && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                OTP sent to <strong>{email}</strong>. Check your email.
              </div>
              {devOtp && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                  <span className="font-semibold text-amber-700">Dev mode OTP: </span>
                  <code className="font-mono font-bold text-amber-800">{devOtp}</code>
                </div>
              )}
              <div>
                <label className="label">6-Digit OTP</label>
                <input
                  type="text"
                  className="input text-center text-2xl font-mono tracking-[0.5em]"
                  placeholder="------"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && <p className="field-error">{error}</p>}
              <button
                className="btn-primary w-full"
                disabled={otp.length !== 6}
                onClick={() => { setError(''); setStep(STEPS.RESET); }}
              >
                Verify OTP
              </button>
              <button
                className="btn-ghost w-full text-sm"
                onClick={() => { setStep(STEPS.EMAIL); setOtp(''); setError(''); }}
              >
                ← Change Email
              </button>
            </div>
          )}

          {step === STEPS.RESET && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="field-error">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === STEPS.DONE && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-8 h-8 text-emerald-600">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Password Reset Successful</p>
                <p className="text-slate-500 text-sm mt-1">You can now sign in with your new password.</p>
              </div>
              <Link to="/login" className="btn-primary inline-flex">
                Go to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
