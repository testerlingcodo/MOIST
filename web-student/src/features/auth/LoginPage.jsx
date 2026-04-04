import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk } from './authSlice';
import MoistSeal from '../../components/branding/MoistSeal';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginThunk({ identifier, password }));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #7a1324 0%, #5a0d1a 60%, #3d0812 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full bg-amber-400" />
          <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full bg-amber-300" />
        </div>

        <div className="relative flex items-center gap-3">
          <MoistSeal size={42} />
          <div>
            <span className="text-white font-black text-lg tracking-widest uppercase">MOIST</span>
            <span className="text-amber-400 font-black text-lg">, INC.</span>
          </div>
        </div>

        <div className="relative">
          <div className="w-36 h-36 mb-8 mx-auto lg:mx-0">
            <MoistSeal size={144} />
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Student<br />
            <span className="text-amber-400">Self-Service Portal</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Misamis Oriental Institute of Science and Technology, Inc.<br />
            Balingasag, Misamis Oriental
          </p>
        </div>

        <div className="relative text-white/40 text-sm">
          © {new Date().getFullYear()} MOIST, INC. · All rights reserved
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <MoistSeal size={40} />
            <div>
              <span className="font-black text-[#7a1324] text-lg tracking-widest uppercase">MOIST</span>
              <span className="font-black text-amber-500 text-lg">, INC.</span>
            </div>
          </div>

          <div className="card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Student Sign In</h1>
              <p className="text-slate-500 text-sm mt-1">Sign in with your assigned student number</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Student Number</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. C001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: '#7a1324' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? (
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
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl font-semibold text-white text-sm transition-all mt-2"
                style={{ background: 'linear-gradient(135deg, #7a1324 0%, #5a0d1a 100%)' }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            For account issues, contact the Registrar's Office.
          </p>
        </div>
      </div>
    </div>
  );
}
