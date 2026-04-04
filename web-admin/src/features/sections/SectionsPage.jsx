import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useActiveTerm } from '../../hooks/useActiveTerm';

const YEAR_LEVELS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const SEMESTER_ORDER = ['1st', '2nd', 'summer'];
const SEMESTER_LABEL = { '1st': '1st Semester', '2nd': '2nd Semester', summer: 'Summer' };

const SCHOOL_YEARS = (() => {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => `${cur - i}-${cur - i + 1}`);
})();

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getSubjectCourses(subject) {
  if (subject?.is_minor && Array.isArray(subject.minor_courses) && subject.minor_courses.length) {
    return subject.minor_courses;
  }
  return [subject?.course || 'General'];
}

function matchesSelectedCourse(subject, selectedCourse) {
  return getSubjectCourses(subject).includes(selectedCourse);
}

export default function SectionsPage() {
  const { schoolYear: activeSchoolYear, label: termLabel, loading: termLoading } = useActiveTerm();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSchoolYear, setFilterSchoolYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    if (activeSchoolYear && !filterSchoolYear) setFilterSchoolYear(activeSchoolYear);
  }, [activeSchoolYear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load all semesters — no semester filter
      const res = await client.get('/subjects', { params: { limit: 1000, is_active: true } });
      setSubjects(res.data.data || []);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSelectedCourse(null);
    setSelectedYear(null);
  }, [filterSchoolYear]);

  // Level 1: course summary (all semesters combined)
  const courseSummary = useMemo(() => {
    const map = new Map();
    for (const s of subjects) {
      getSubjectCourses(s).forEach((course) => {
        if (!map.has(course)) map.set(course, { course, totalSubjects: 0, totalUnits: 0, years: {} });
        const cur = map.get(course);
        cur.totalSubjects += 1;
        cur.totalUnits += Number(s.units || 0);
        const y = s.year_level || 0;
        if (!cur.years[y]) cur.years[y] = { count: 0, units: 0 };
        cur.years[y].count += 1;
        cur.years[y].units += Number(s.units || 0);
      });
    }
    return [...map.values()].sort((a, b) => a.course.localeCompare(b.course));
  }, [subjects]);

  // Level 2: year info for selected course
  const yearInfo = useMemo(() => {
    if (!selectedCourse) return {};
    const info = {};
    for (const s of subjects) {
      if (!matchesSelectedCourse(s, selectedCourse)) continue;
      const y = s.year_level || 0;
      if (!info[y]) info[y] = { count: 0, units: 0 };
      info[y].count += 1;
      info[y].units += Number(s.units || 0);
    }
    return info;
  }, [subjects, selectedCourse]);

  // Level 3: subjects grouped by semester for selected course + year
  const semesterGroups = useMemo(() => {
    if (!selectedCourse || !selectedYear) return [];
    const filtered = subjects.filter(
      (s) => matchesSelectedCourse(s, selectedCourse) && s.year_level === selectedYear
    );
    const map = new Map();
    for (const s of filtered) {
      const sem = s.semester || 'other';
      if (!map.has(sem)) map.set(sem, []);
      map.get(sem).push(s);
    }
    // Sort by semester order
    return SEMESTER_ORDER
      .filter(sem => map.has(sem))
      .map(sem => ({
        semester: sem,
        label: SEMESTER_LABEL[sem] || sem,
        subjects: map.get(sem).sort((a, b) => (a.code || '').localeCompare(b.code || '')),
        totalUnits: map.get(sem).reduce((t, s) => t + Number(s.units || 0), 0),
      }));
  }, [subjects, selectedCourse, selectedYear]);

  const grandTotalUnits = useMemo(
    () => semesterGroups.reduce((t, g) => t + g.totalUnits, 0),
    [semesterGroups]
  );

  const goBack = () => {
    if (selectedYear) { setSelectedYear(null); return; }
    setSelectedCourse(null);
  };

  const pageTitle = !selectedCourse
    ? 'Class Schedule'
    : selectedYear
      ? `${selectedCourse} — ${YEAR_LABEL[selectedYear]}`
      : selectedCourse;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        {selectedCourse && (
          <button onClick={goBack} className="mt-1 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">
            {!termLoading && termLabel
              ? <span className="font-semibold text-[#7a1324]">Active Term: {termLabel}</span>
              : 'Subject schedules per course and year level'}
          </p>
        </div>
      </div>

      {/* Filter — school year only */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          School Year
        </div>
        <select
          className="input w-44 text-sm"
          value={filterSchoolYear}
          onChange={e => setFilterSchoolYear(e.target.value)}
        >
          <option value="">All School Years</option>
          {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {filterSchoolYear !== activeSchoolYear && activeSchoolYear && (
          <button
            className="text-xs text-[#7a1324] font-semibold hover:underline"
            onClick={() => setFilterSchoolYear(activeSchoolYear)}
          >
            Reset to active term
          </button>
        )}
      </div>

      {loading ? (
        <div className="card py-12 text-center text-slate-400">Loading schedule...</div>
      ) : !selectedCourse ? (
        /* ── Level 1: Course cards ── */
        courseSummary.length === 0 ? (
          <div className="card py-16 text-center text-slate-400">
            <p className="font-semibold">No subjects found</p>
            <p className="mt-1 text-xs">Add subjects to see the schedule here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courseSummary.map(course => (
              <button
                key={course.course}
                onClick={() => { setSelectedCourse(course.course); setSelectedYear(null); }}
                className="card group cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-5 w-5">
                    <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/>
                    <path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5"/>
                  </svg>
                </div>
                <p className="text-sm font-black text-slate-800 transition-colors group-hover:text-[#7a1324]">
                  {course.course}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {course.totalSubjects} subject{course.totalSubjects !== 1 ? 's' : ''} · {course.totalUnits} units
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {YEAR_LEVELS.filter(y => course.years[y]).map(y => (
                    <span key={y} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Yr {y}: {course.years[y].units} units
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )
      ) : !selectedYear ? (
        /* ── Level 2: Year level cards ── */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {YEAR_LEVELS.map(y => {
            const info = yearInfo[y];
            return (
              <button
                key={y}
                onClick={() => info && setSelectedYear(y)}
                disabled={!info}
                className={`card p-5 text-left transition-all ${info ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-40 cursor-not-allowed'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${info ? 'bg-[#7a1324]/10' : 'bg-slate-100'}`}>
                  <span className={`font-black text-sm ${info ? 'text-[#7a1324]' : 'text-slate-400'}`}>Y{y}</span>
                </div>
                <p className="font-black text-slate-800 text-sm">{YEAR_LABEL[y]}</p>
                {info ? (
                  <>
                    <p className="mt-0.5 text-xs text-slate-500">{info.count} subject{info.count !== 1 ? 's' : ''}</p>
                    <p className="text-xs font-bold text-[#7a1324] mt-1">{info.units} units total</p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-400">No subjects</p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Level 3: Subjects grouped by semester ── */
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">All semesters</p>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#fff8eb] border border-[#f6c445]/40">
              <span className="text-xs text-slate-500">Grand Total Units:</span>
              <span className="font-black text-[#7a1324]">{grandTotalUnits}</span>
            </div>
          </div>

          {semesterGroups.length === 0 ? (
            <div className="card py-12 text-center text-slate-400">No subjects found for this year level.</div>
          ) : (
            <div className="space-y-6">
              {semesterGroups.map(group => (
                <div key={group.semester}>
                  {/* Semester header */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                      {group.label}
                    </h3>
                    <span className="text-xs font-bold text-[#7a1324] bg-[#fff8eb] border border-[#f6c445]/40 px-3 py-1 rounded-full">
                      {group.totalUnits} units
                    </span>
                  </div>

                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Code', 'Subject', 'Units', 'Instructor', 'Days', 'Time', 'Room'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.subjects.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{s.code}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{s.name}</p>
                              {s.is_minor ? (
                                <span className="mt-0.5 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 border border-violet-200">
                                  Minor
                                </span>
                              ) : s.course ? (
                                <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200">
                                  Major
                                </span>
                              ) : (
                                <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                                  GE
                                </span>
                              )}
                              {s.section_name && (
                                <p className="text-[10px] text-slate-400 mt-0.5">Section {s.section_name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-700">{s.units}</td>
                            <td className="px-4 py-3">
                              {s.teacher_last_name ? (
                                <span className="text-slate-700 text-xs">{s.teacher_last_name}, {s.teacher_first_name}</span>
                              ) : (
                                <span className="text-amber-500 text-xs font-medium">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs font-medium">{s.schedule_days || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {s.start_time && s.end_time
                                ? `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{s.room || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={2} className="px-4 py-2 text-xs font-bold text-slate-500">Subtotal</td>
                          <td className="px-4 py-2 text-center font-black text-[#7a1324]">{group.totalUnits}</td>
                          <td colSpan={4} className="px-4 py-2 text-xs text-slate-400">
                            {group.subjects.filter(s => !s.teacher_last_name).length > 0
                              ? `${group.subjects.filter(s => !s.teacher_last_name).length} unassigned`
                              : 'All assigned'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
