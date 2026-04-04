import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginThunk } from './authSlice';
import MoistSeal from '../../components/branding/MoistSeal';

function ContactOfficeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-[28px] bg-white shadow-2xl p-7 text-center"
        onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,rgba(122,19,36,0.1),rgba(163,38,57,0.15))' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-8 h-8">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        <h2 className="text-xl font-black mb-2" style={{ color: '#7a1324' }}>Need Help with Your Password?</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          For security reasons, administrative accounts cannot reset passwords online.
          Please visit the appropriate office in person for assistance.
        </p>

        <div className="space-y-3 text-left mb-6">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(122,19,36,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-4 h-4">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Registrar's Office</p>
              <p className="text-xs text-slate-500 mt-0.5">For Registrar, Dean, and Staff accounts</p>
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(122,19,36,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-4 h-4">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">System Administrator</p>
              <p className="text-xs text-slate-500 mt-0.5">For Admin accounts and urgent access issues</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#7a1324,#5a0d1a)' }}
        >
          Got it, I'll visit the office
        </button>
      </div>
    </div>
  );
}

const schema = yup.object({
  email: yup.string().required('Email or Student ID is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [showPw, setShowPw] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await dispatch(loginThunk(data));
    if (loginThunk.fulfilled.match(result)) navigate('/');
  };

  return (
    <>
    {showContactModal && <ContactOfficeModal onClose={() => setShowContactModal(false)} />}
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #7a1324 0%, #5a0d1a 60%, #3d0812 100%)' }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full bg-amber-400" />
          <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full bg-amber-300" />
        </div>

        <div className="relative flex items-center gap-3">
          <MoistSeal size={42} compact />
          <div>
            <span className="text-white font-black text-lg tracking-widest uppercase">MOIST</span>
            <span className="text-amber-400 font-black text-lg">, INC.</span>
          </div>
        </div>

        <div className="relative">
          <div className="w-32 h-32 mb-8 mx-auto lg:mx-0">
            <MoistSeal size={128} />
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Administrative<br />
            <span className="text-amber-400">Portal</span>
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
            <MoistSeal size={40} compact />
            <div>
              <span className="font-black text-[#7a1324] text-lg tracking-widest uppercase">MOIST</span>
              <span className="font-black text-amber-500 text-lg">, INC.</span>
            </div>
          </div>

          <div className="card">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Administrative Sign In</h1>
              <p className="text-slate-500 text-sm mt-1">For authorized personnel only — admin, registrar, dean, and staff</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  {...register('email')}
                  type="text"
                  className="input"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
                {errors.email && (
                  <p className="field-error">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="text-xs text-[#7a1324] hover:text-[#5a0d1a] font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
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
                {errors.password && (
                  <p className="field-error">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

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
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
