import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import client from '../../api/client';

// ─── Status helpers ──────────────────────────────────────────
const STATUS_MAP = {
  notTaken:    { label: 'Not Taken',      cls: 'bg-slate-50 text-slate-400 border-slate-200' },
  enrolled:    { label: 'Enrolled',       cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  inProgress:  { label: 'In Progress',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  underReview: { label: 'Approved',       cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  passed:      { label: 'Passed',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:      { label: 'For Retake',     cls: 'bg-red-50 text-red-700 border-red-200' },
  incomplete:  { label: 'Incomplete',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  dropped:     { label: 'Dropped',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

function getStatus(s) {
  const gs = s.grade_status;
  const r  = s.remarks;
  if (!s.enrollment_id) return 'notTaken';
  if (!gs || gs === 'draft') return 'enrolled';
  if (gs === 'submitted') return 'inProgress';
  if (gs === 'under_review') return 'underReview';
  if (gs === 'official') {
    if (r === 'failed') return 'failed';
    if (r === 'incomplete') return 'incomplete';
    if (r === 'dropped') return 'dropped';
    return 'passed';
  }
  return 'enrolled';
}

const SEMESTERS = ['1st', '2nd', 'summer'];
const SEM_LABEL = { '1st': '1st Semester', '2nd': '2nd Semester', summer: 'Summer' };

// ─── Subject Row ─────────────────────────────────────────────
function SubjectRow({ subject }) {
  const status = getStatus(subject);
  const cfg    = STATUS_MAP[status];
  const isFailed  = status === 'failed';
  const showGrade = status === 'passed' || status === 'underReview';
  const fin = subject.final_grade;
  const mid = subject.midterm_grade;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${isFailed ? 'bg-red-50/60 border-red-200' : 'bg-white border-slate-100'}`}>
      {/* Subject info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold leading-snug ${isFailed ? 'text-red-700' : 'text-slate-800'}`}>
          {subject.name}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-xs text-slate-400">{subject.code}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
            {subject.units} u
          </span>
          {subject.section_name && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(122,19,36,0.07)', color: '#7a1324' }}>
              {subject.section_name}
            </span>
          )}
        </div>
        {/* Dean's schedule info */}
        {(subject.teacher_name?.trim() || subject.schedule_days || subject.room) && (
          <div className="mt-1.5 space-y-0.5 text-xs text-slate-400">
            {subject.teacher_name?.trim() && (
              <p className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 flex-shrink-0">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                {subject.teacher_name}
              </p>
            )}
            {(subject.schedule_days || subject.start_time) && (
              <p className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 flex-shrink-0">
                  <circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {[subject.schedule_days, subject.start_time && subject.end_time && `${subject.start_time}–${subject.end_time}`].filter(Boolean).join(' · ')}
              </p>
            )}
            {subject.room && (
              <p className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 flex-shrink-0">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Room {subject.room}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Grade or status badge */}
      <div className="flex-shrink-0 text-right">
        {showGrade && (fin != null || mid != null) ? (
          <div className="flex items-center gap-1.5">
            {mid != null && (
              <div className="text-center">
                <p className="text-[9px] text-slate-400 font-bold">MID</p>
                <p className={`text-sm font-black ${isFailed ? 'text-red-600' : status === 'passed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {parseFloat(mid).toFixed(2)}
                </p>
              </div>
            )}
            {fin != null && (
              <div className="text-center">
                <p className="text-[9px] text-slate-400 font-bold">FIN</p>
                <p className={`text-sm font-black ${isFailed ? 'text-red-600' : status === 'passed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {parseFloat(fin).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.cls}`}>
            {cfg.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Semester Section ─────────────────────────────────────────
function SemesterSection({ semLabel, subjects }) {
  const totalUnits  = subjects.reduce((s, x) => s + (x.units || 0), 0);
  const passedUnits = subjects
    .filter(x => getStatus(x) === 'passed')
    .reduce((s, x) => s + (x.units || 0), 0);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-2"
        style={{ background: 'rgba(122,19,36,0.06)' }}>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-3.5 h-3.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-xs font-bold" style={{ color: '#7a1324' }}>{semLabel}</span>
        </div>
        <span className="text-xs text-slate-500">{passedUnits}/{totalUnits} units passed</span>
      </div>
      <div className="space-y-2">
        {subjects.map(s => <SubjectRow key={s.subject_id} subject={s} />)}
      </div>
    </div>
  );
}

// ─── Year Tab ─────────────────────────────────────────────────
function YearTab({ year, subjects }) {
  const totalUnits  = subjects.reduce((s, x) => s + (x.units || 0), 0);
  const passedUnits = subjects
    .filter(x => getStatus(x) === 'passed')
    .reduce((s, x) => s + (x.units || 0), 0);
  const pct = totalUnits > 0 ? passedUnits / totalUnits : 0;

  return (
    <div>
      {/* Year progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold text-slate-700">Year {year}</span>
          <span className="text-xs text-slate-400">{passedUnits} / {totalUnits} units</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct * 100}%`, background: '#10b981' }}
          />
        </div>
      </div>

      {SEMESTERS.map(sem => {
        const semSubjects = subjects.filter(s => s.semester === sem);
        if (!semSubjects.length) return null;
        return (
          <SemesterSection
            key={sem}
            semLabel={SEM_LABEL[sem]}
            subjects={semSubjects}
          />
        );
      })}

      {subjects.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-8">
          No subjects for Year {year} yet.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ProspectusPage() {
  const { user } = useSelector(s => s.auth);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeYear, setActiveYear] = useState(1);

  useEffect(() => {
    if (!user?.studentId) return;
    setLoading(true);
    setError(null);
    client.get(`/students/${user.studentId}/prospectus`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load prospectus.');
        setLoading(false);
      });
  }, [user?.studentId]);

  const subjects = useMemo(() => data?.subjects || [], [data]);
  const years    = [1, 2, 3, 4];

  const totalAll  = subjects.reduce((s, x) => s + (x.units || 0), 0);
  const passedAll = subjects
    .filter(x => getStatus(x) === 'passed')
    .reduce((s, x) => s + (x.units || 0), 0);

  if (loading) {
    return (
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-7 bg-slate-100 rounded-xl w-48 animate-pulse mb-2" />
          <div className="h-4 bg-slate-100 rounded-xl w-72 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="card h-20 animate-pulse bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
        <div className="card text-center py-12">
          <p className="text-slate-500 font-medium">{error}</p>
          <button className="btn-primary mt-4 text-sm"
            onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const student = data?.student;

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="page-title">My Prospectus</h1>
        <p className="page-subtitle">
          Curriculum subjects based on the dean's class schedule. Track your progress per year and semester.
        </p>
      </div>

      {/* Student info + overall progress */}
      {student && (
        <div className="card mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900">{student.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {student.course} · Year {student.year_level} · {student.student_number}
              </p>
            </div>
            <div className="flex items-center gap-6">
              {data?.gpa && (
                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: '#7a1324' }}>{data.gpa}</p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider">GPA</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{passedAll}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider">UNITS PASSED</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-700">{totalAll}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider">TOTAL UNITS</p>
              </div>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Overall completion</span>
              <span>{totalAll > 0 ? Math.round((passedAll / totalAll) * 100) : 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: totalAll > 0 ? `${(passedAll / totalAll) * 100}%` : '0%',
                  background: 'linear-gradient(90deg, #7a1324, #a12a3d)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(122,19,36,0.07)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={1.5} className="w-7 h-7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-slate-500 font-medium text-sm">No subjects in your prospectus yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Subjects will appear here once the dean has opened them for your course.
          </p>
        </div>
      ) : (
        <>
          {/* Year tabs */}
          <div className="flex gap-1 mb-5 border-b border-slate-200">
            {years.map(y => {
              const ySubjects = subjects.filter(s => s.year_level === y);
              if (!ySubjects.length) return null;
              return (
                <button
                  key={y}
                  onClick={() => setActiveYear(y)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    activeYear === y
                      ? 'border-[#7a1324] text-[#7a1324]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Year {y}
                </button>
              );
            })}
          </div>

          {/* Active year content */}
          <YearTab
            year={activeYear}
            subjects={subjects.filter(s => s.year_level === activeYear)}
          />
        </>
      )}
    </div>
  );
}
