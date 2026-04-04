import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client';

const YEAR_LEVELS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

const STATUS_LABEL = {
  submitted:    { label: 'Submitted',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Approved',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  official:     { label: 'Official',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft:        { label: 'Draft',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

function GradeValue({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-300">—</span>;
  const n = Number(value);
  const color = n <= 3.0 ? 'text-emerald-700' : 'text-red-600';
  return <span className={`font-semibold ${color}`}>{n.toFixed(2)}</span>;
}

function StudentCard({ student, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card w-full cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-800">{student.last_name}, {student.first_name}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">{student.student_number || 'No student number'}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
          {student.subjectCount} subject{student.subjectCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {student.subjects.slice(0, 4).map((subject) => (
          <span key={subject.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {subject.subject_code}
          </span>
        ))}
        {student.subjects.length > 4 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            +{student.subjects.length - 4} more
          </span>
        )}
      </div>
    </button>
  );
}

export default function AllGradesPage() {
  const [allGrades, setAllGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadGrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (statusFilter) params.submission_status = statusFilter;
      else {
        // Load submitted, under_review, and official — exclude drafts
        // Backend may not support multi-status; fetch without filter and exclude drafts client-side
      }
      const res = await client.get('/grades', { params });
      const data = res.data?.data || [];
      // Exclude drafts (teachers haven't submitted yet)
      setAllGrades(statusFilter ? data : data.filter(g => g.submission_status !== 'draft'));
    } catch {
      setAllGrades([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  const courseSummary = useMemo(() => {
    const map = new Map();
    for (const grade of allGrades) {
      if (!grade.course) continue;
      if (!map.has(grade.course)) map.set(grade.course, { course: grade.course, total: 0, years: {} });
      const cur = map.get(grade.course);
      cur.total += 1;
      cur.years[grade.year_level] = (cur.years[grade.year_level] || 0) + 1;
    }
    return [...map.values()].sort((a, b) => a.course.localeCompare(b.course));
  }, [allGrades]);

  const yearCounts = useMemo(() => {
    if (!selectedCourse) return {};
    const counts = {};
    for (const grade of allGrades) {
      if (grade.course !== selectedCourse) continue;
      counts[grade.year_level] = (counts[grade.year_level] || 0) + 1;
    }
    return counts;
  }, [allGrades, selectedCourse]);

  const studentGroups = useMemo(() => {
    if (!selectedCourse || !selectedYear) return [];
    const query = search.trim().toLowerCase();
    const map = new Map();
    for (const grade of allGrades) {
      if (grade.course !== selectedCourse || grade.year_level !== selectedYear) continue;
      if (query) {
        const identity = `${grade.first_name} ${grade.last_name} ${grade.student_number || ''}`.toLowerCase();
        if (!identity.includes(query)) continue;
      }
      if (!map.has(grade.student_number)) {
        map.set(grade.student_number, {
          studentKey: grade.student_number,
          student_number: grade.student_number,
          first_name: grade.first_name,
          last_name: grade.last_name,
          course: grade.course,
          year_level: grade.year_level,
          subjects: [],
        });
      }
      map.get(grade.student_number).subjects.push(grade);
    }
    return [...map.values()]
      .map(s => ({ ...s, subjectCount: s.subjects.length, subjects: s.subjects.sort((a, b) => (a.subject_code || '').localeCompare(b.subject_code || '')) }))
      .sort((a, b) => { const l = a.last_name.localeCompare(b.last_name); return l !== 0 ? l : a.first_name.localeCompare(b.first_name); });
  }, [allGrades, search, selectedCourse, selectedYear]);

  const selectedStudent = useMemo(
    () => studentGroups.find(s => s.studentKey === selectedStudentId) || null,
    [selectedStudentId, studentGroups]
  );

  const selectedStudentGrades = useMemo(() => {
    if (!selectedStudent) return [];
    const query = search.trim().toLowerCase();
    if (!query) return selectedStudent.subjects;
    return selectedStudent.subjects.filter(g =>
      `${g.subject_code || ''} ${g.subject_name || ''}`.toLowerCase().includes(query)
    );
  }, [search, selectedStudent]);

  useEffect(() => {
    if (!selectedCourse) { setSelectedYear(null); setSelectedStudentId(null); return; }
    if (!selectedYear && selectedCourse) {
      const first = YEAR_LEVELS.find(y => (yearCounts[y] || 0) > 0) || YEAR_LEVELS[0];
      setSelectedYear(first);
    }
  }, [selectedCourse, selectedYear, yearCounts]);

  useEffect(() => {
    if (selectedStudentId && !studentGroups.some(s => s.studentKey === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, studentGroups]);

  const goBack = () => {
    if (selectedStudentId) { setSelectedStudentId(null); setSearch(''); return; }
    setSelectedCourse(null); setSelectedYear(null); setSearch('');
  };

  return (
    <div className="max-w-7xl p-6">
      <div className="mb-6 flex items-center gap-3">
        {(selectedCourse || selectedStudentId) && (
          <button onClick={goBack} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900">
            {!selectedCourse
              ? 'Submitted Grades'
              : !selectedStudent
                ? `${selectedCourse} — ${YEAR_LABEL[selectedYear]}`
                : `${selectedStudent.last_name}, ${selectedStudent.first_name}`}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {!selectedCourse
              ? `${allGrades.length} grade record${allGrades.length !== 1 ? 's' : ''} — read-only view`
              : !selectedStudent
                ? 'Select a student to view their grade records'
                : `${selectedStudent.course} · Year ${selectedStudent.year_level} · ${selectedStudent.student_number}`}
          </p>
        </div>

        {/* Status filter */}
        {!selectedCourse && (
          <select
            className="input w-44 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedCourse(null); setSelectedYear(null); setSelectedStudentId(null); }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Approved (Dean)</option>
            <option value="official">Official</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
            <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading grade records...
        </div>
      ) : !selectedCourse ? (
        courseSummary.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-12 w-12 opacity-40">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="font-semibold">No submitted grades found</p>
            <p className="mt-1 text-xs">Grades will appear here once teachers submit them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courseSummary.map(course => (
              <button
                key={course.course}
                onClick={() => { setSelectedCourse(course.course); setSelectedStudentId(null); setSearch(''); }}
                className="card group cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-5 w-5">
                    <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" />
                    <path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5" />
                  </svg>
                </div>
                <p className="text-sm font-black text-slate-800 transition-colors group-hover:text-[#7a1324]">{course.course}</p>
                <p className="mt-0.5 text-xs text-slate-400">{course.total} grade record{course.total !== 1 ? 's' : ''}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {YEAR_LEVELS.filter(y => course.years[y]).map(y => (
                    <span key={y} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Yr {y}: {course.years[y]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )
      ) : !selectedStudent ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {YEAR_LEVELS.map(year => {
              const count = yearCounts[year] || 0;
              return (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setSelectedStudentId(null); setSearch(''); }}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    selectedYear === year ? 'text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={selectedYear === year ? { background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' } : {}}
                >
                  {YEAR_LABEL[year]}
                  {count > 0 && (
                    <span className={`ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      selectedYear === year ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mb-4 max-w-sm">
            <input
              type="text"
              placeholder="Search student name or number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
            />
          </div>
          {studentGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No grade records for {YEAR_LABEL[selectedYear]}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {studentGroups.map(student => (
                <StudentCard key={student.studentKey} student={student} onClick={() => { setSelectedStudentId(student.studentKey); setSearch(''); }} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-black text-slate-900">{selectedStudent.last_name}, {selectedStudent.first_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedStudent.student_number} | {selectedStudent.course} | Year {selectedStudent.year_level}
              </p>
            </div>
            <input
              type="text"
              placeholder="Search subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input min-w-[220px]"
            />
          </div>

          {selectedStudentGrades.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No matching subjects found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Prelim</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Midterm</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Semi-Final</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Final</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedStudentGrades.map(grade => {
                    const st = STATUS_LABEL[grade.submission_status] || STATUS_LABEL.draft;
                    return (
                      <tr key={grade.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{grade.subject_code}</p>
                          <p className="text-xs text-slate-400">{grade.subject_name}</p>
                        </td>
                        <td className="px-4 py-3 text-center"><GradeValue value={grade.prelim_grade} /></td>
                        <td className="px-4 py-3 text-center"><GradeValue value={grade.midterm_grade} /></td>
                        <td className="px-4 py-3 text-center"><GradeValue value={grade.semi_final_grade} /></td>
                        <td className="px-4 py-3 text-center"><GradeValue value={grade.final_grade} /></td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">{grade.remarks || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-400">
                {selectedStudentGrades.length} subject record{selectedStudentGrades.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
