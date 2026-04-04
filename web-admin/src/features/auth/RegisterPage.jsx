import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useCourses } from '../../hooks/useCourses';

export default function RegisterPage() {
  const { courses } = useCourses();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [form, setForm] = useState({
    last_name: '', first_name: '', middle_name: '',
    gender: '', birthdate: '',
    course: '', year_level: '',
    contact_number: '', address: '', email: '',
    password: '', confirm: '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      const res = await client.post('/auth/register', {
        ...payload,
        year_level: payload.year_level ? Number(payload.year_level) : undefined,
        email: payload.email || undefined,
      });
      setStudentNumber(res.data.studentNumber);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (studentNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md card text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-8 h-8 text-emerald-600">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-xl">Registration Submitted!</p>
            <p className="text-slate-500 text-sm mt-1">Your Student ID has been assigned:</p>
            <div className="mt-4 py-4 px-8 bg-blue-50 border-2 border-blue-200 rounded-2xl inline-block">
              <span className="text-4xl font-bold font-mono text-blue-700 tracking-widest">{studentNumber}</span>
            </div>
            <p className="text-slate-400 text-xs mt-3">Save this ID — you will use it to log in once approved.</p>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-amber-800">
              Your registration is <strong>pending approval</strong> from the Registrar. You will be able to log in once your account has been approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Student Registration</h1>
          <p className="text-slate-500 text-sm mt-1">Fill in your details to create your student account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Last Name <span className="text-red-500">*</span></label>
                <input className="input" value={form.last_name} onChange={set('last_name')} required />
              </div>
              <div>
                <label className="label">First Name <span className="text-red-500">*</span></label>
                <input className="input" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div>
                <label className="label">Middle Name</label>
                <input className="input" value={form.middle_name} onChange={set('middle_name')} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Academic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Course <span className="text-red-500">*</span></label>
                <select className="input" value={form.course} onChange={set('course')} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year Level <span className="text-red-500">*</span></label>
                <select className="input" value={form.year_level} onChange={set('year_level')} required>
                  <option value="">Select year</option>
                  {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Birthdate</label>
                <input type="date" className="input" value={form.birthdate} onChange={set('birthdate')} />
              </div>
              <div>
                <label className="label">Contact Number</label>
                <input className="input" placeholder="09xxxxxxxxx" value={form.contact_number} onChange={set('contact_number')} />
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={set('address')} />
            </div>

            <div>
              <label className="label">
                Email{' '}
                <span className="text-slate-400 font-normal text-xs">(optional — used for password reset only)</span>
              </label>
              <input type="email" className="input" placeholder="your@email.com" value={form.email} onChange={set('email')} />
            </div>

            <hr className="border-slate-200" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
              </div>
              <div>
                <label className="label">Confirm Password <span className="text-red-500">*</span></label>
                <input type="password" className="input" placeholder="Re-enter password" value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Registering...
                </span>
              ) : 'Register'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                Already have an account? Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
