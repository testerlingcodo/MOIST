import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import client from '../../api/client';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await client.get(`/students/${user.studentId}`);
        if (active) setStudent(res.data);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (user?.studentId) load();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Your personal information on record</p>
      </div>

      {loading ? (
        <div className="card animate-pulse space-y-4">
          <div className="h-20 w-20 bg-slate-100 rounded-full mx-auto" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      ) : !student ? (
        <div className="card text-center py-10 text-slate-400 text-sm">Failed to load profile.</div>
      ) : (
        <div className="space-y-4">
          {/* Avatar + name */}
          <div className="card flex items-center gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#5f0f1c,#a32639)' }}>
              {student.first_name?.[0]?.toUpperCase()}{student.last_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
              <p className="font-mono text-sm text-slate-500 mt-0.5">{student.student_number}</p>
              <span className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                student.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
              </span>
            </div>
          </div>

          {/* Academic info */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Academic Information</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Course" value={student.course} />
              <Field label="Year Level" value={student.year_level ? `Year ${student.year_level}` : null} />
            </div>
          </div>

          {/* Personal info */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Personal Information</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="First Name" value={student.first_name} />
              <Field label="Last Name" value={student.last_name} />
              <Field label="Middle Name" value={student.middle_name} />
              <Field label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
              <Field label="Birthdate" value={student.birthdate} />
              <Field label="Contact Number" value={student.contact_number} />
              <div className="col-span-2">
                <Field label="Email Address" value={student.email} />
              </div>
              <div className="col-span-2">
                <Field label="Address" value={student.address} />
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-slate-400 pb-2">
            To update your information, please visit the Registrar's Office.
          </p>
        </div>
      )}
    </div>
  );
}
