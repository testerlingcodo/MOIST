import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../../api/client';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const STATUS_META = {
  for_subject_enrollment: { label: 'Under Evaluation',    dot: 'bg-blue-400',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  for_assessment:         { label: 'For Approval',         dot: 'bg-violet-400',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  for_payment:            { label: 'For Payment',          dot: 'bg-orange-400',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  for_registration:       { label: 'For Registration',     dot: 'bg-teal-400',    cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  enrolled:               { label: 'Officially Enrolled',  dot: 'bg-emerald-400', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const STEPS = [
  { key: 'submitted',              label: 'Submitted' },
  { key: 'for_subject_enrollment', label: 'Evaluation' },
  { key: 'for_assessment',         label: 'Approval' },
  { key: 'for_payment',            label: 'Payment' },
  { key: 'for_registration',       label: 'Registration' },
  { key: 'enrolled',               label: 'Enrolled' },
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

  return (
    <div className="flex items-center gap-0 mt-4">
      {STEPS.map((step, i) => {
        const done = isEnrolled || i < currentIdx;
        const active = !isEnrolled && i === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {active && (
                  <span className="absolute inline-flex h-8 w-8 rounded-full opacity-30 animate-ping"
                    style={{ background: '#7a1324' }} />
                )}
                <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done   ? 'text-white' :
                  active ? 'text-white ring-2 ring-offset-2 ring-[#7a1324]' :
                  'bg-slate-100 text-slate-400'
                }`}
                  style={(done || active) ? { background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' } : {}}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : active ? (
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
              </div>

              <p className={`text-[9px] mt-1.5 font-semibold text-center whitespace-nowrap ${
                active ? 'text-[#7a1324]' : done ? 'text-slate-500' : 'text-slate-300'
              }`}>
                {active ? '● ' : ''}{step.label}
              </p>
            </div>

            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-500 ${
                done ? 'bg-[#7a1324]' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const [student, setStudent] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [studentRes, termRes] = await Promise.all([
          client.get(`/students/${user.studentId}`),
          client.get('/academic-settings/active'),
        ]);
        if (!active) return;
        setStudent(studentRes.data);
        setActiveTerm(termRes.data);

        if (termRes.data) {
          const batchRes = await client.get('/enrollment-batches', {
            params: {
              school_year: termRes.data.school_year,
              semester: termRes.data.semester,
              limit: 1,
            },
          });
          if (active) setBatch(batchRes.data?.data?.[0] || null);
        }
      } catch {
        // individual widgets handle empty states
      } finally {
        if (active) setLoading(false);
      }
    }
    if (user?.studentId) load();
    return () => { active = false; };
  }, [user]);

  const statusMeta = batch ? (STATUS_META[batch.status] || { label: batch.status, dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 border-slate-200' }) : null;
  const isPending = batch?.status === 'pending'; // old state — shouldn't happen for new batches

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      {/* Welcome hero */}
      <div className="rounded-[24px] p-6 text-white mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#5f0f1c 0%,#7a1324 56%,#a32639 100%)', boxShadow: '0 16px 40px rgba(122,19,36,0.22)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(246,196,69,0.22) 0%, transparent 55%)' }} />
        <div className="relative">
          <p className="text-amber-200/80 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-2xl font-black">
            {loading ? 'Loading…' : student ? `${student.first_name} ${student.last_name}` : 'Student'}
          </h1>
          <p className="text-white/60 text-sm mt-0.5 font-mono">{student?.student_number || '—'}</p>
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/15 font-semibold">{student?.course || '—'}</span>
            <span className="px-3 py-1 rounded-full bg-white/15 font-semibold">Year {student?.year_level || '—'}</span>
            {activeTerm && (
              <span className="px-3 py-1 rounded-full bg-amber-400/30 text-amber-100 font-semibold">
                {activeTerm.school_year} — {activeTerm.semester} Sem
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment status card */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-800">Enrollment Status</h2>
          <Link to="/enrollment" className="text-xs font-semibold" style={{ color: '#7a1324' }}>
            View details →
          </Link>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          {activeTerm ? `${activeTerm.school_year} — ${activeTerm.semester} Semester` : 'No active term'}
        </p>

        {loading ? (
          <div className="h-8 bg-slate-100 animate-pulse rounded-xl" />
        ) : !activeTerm ? (
          <p className="text-sm text-slate-400 py-1">No active academic term. Contact the Registrar.</p>
        ) : !batch ? (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-sm text-slate-500 font-medium">Not yet enrolled for this term</span>
            </div>
            <Link to="/enrollment"
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7a1324,#a32639)' }}>
              Pre-Enroll Now
            </Link>
          </div>
        ) : isPending ? (
          /* Legacy pending state */
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-700 font-medium">Pending — waiting for processing</span>
          </div>
        ) : (
          <>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${statusMeta.cls}`}>
              {batch.status === 'enrolled' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              ) : (
                <span className={`w-2 h-2 rounded-full animate-pulse ${statusMeta.dot}`} />
              )}
              {statusMeta.label}
            </div>
            <StepTracker status={batch.status} />
          </>
        )}
      </div>

      {/* Current subjects */}
      {batch && batch.status !== 'for_subject_enrollment' && batch.subjects?.length > 0 && (
        <div className="card mb-5">
          <h2 className="font-bold text-slate-800 mb-3">Enrolled Subjects</h2>
          <div className="space-y-2">
            {batch.subjects.map((s) => (
              <div key={s.subject_id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{s.subject_code} — {s.subject_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.units} units
                    {s.section_name ? ` · Section ${s.section_name}` : ''}
                    {s.schedule_days ? ` · ${s.schedule_days}` : ''}
                    {s.start_time && s.end_time ? ` · ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}` : ''}
                    {s.room ? ` · ${s.room}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { to: '/grades', label: 'My Grades', icon: '📊', desc: 'View academic records' },
          { to: '/announcements', label: 'Announcements', icon: '📢', desc: 'Latest school updates' },
          { to: '/profile', label: 'My Profile', icon: '👤', desc: 'View your information' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className="card flex flex-col gap-1.5 hover:shadow-lg transition-shadow cursor-pointer p-4">
            <span className="text-2xl">{item.icon}</span>
            <p className="font-bold text-slate-800 text-sm">{item.label}</p>
            <p className="text-xs text-slate-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
