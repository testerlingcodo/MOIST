import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const YEAR_LEVELS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const STATUS_META = {
  draft: { label: 'Draft', cls: 'border-slate-200 bg-slate-50 text-slate-500' },
  submitted: { label: 'Submitted', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  under_review: { label: 'Approved', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  official: { label: 'Official', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
};

function isApprovableGrade(grade) {
  return grade?.submission_status === 'submitted';
}

function GradeValue({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-300">-</span>;
  const n = Number(value);
  const color = n <= 3.0 ? 'text-emerald-700' : n <= 5.0 ? 'text-red-600' : 'text-slate-700';
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
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
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

export default function DeanGradesPage() {
  const { confirm, confirmProps } = useConfirm();
  const { schoolYear, semester, label: activeTermLabel, loading: termLoading } = useActiveTerm();
  const [allGrades, setAllGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadGrades = useCallback(async () => {
    if (!schoolYear || !semester) {
      setAllGrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await client.get('/grades', {
        params: {
          limit: 2000,
          school_year: schoolYear,
          semester,
        },
      });
      setAllGrades(res.data?.data || []);
    } catch {
      setAllGrades([]);
    } finally {
      setLoading(false);
    }
  }, [schoolYear, semester]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const courseSummary = useMemo(() => {
    const map = new Map();

    for (const grade of allGrades) {
      if (!grade.course) continue;

      if (!map.has(grade.course)) {
        map.set(grade.course, {
          course: grade.course,
          total: 0,
          submitted: 0,
          approved: 0,
          official: 0,
          draft: 0,
          years: {},
        });
      }

      const current = map.get(grade.course);
      current.total += 1;
      if (grade.submission_status === 'submitted') current.submitted += 1;
      else if (grade.submission_status === 'under_review') current.approved += 1;
      else if (grade.submission_status === 'official') current.official += 1;
      else current.draft += 1;
      current.years[grade.year_level] = (current.years[grade.year_level] || 0) + 1;
    }

    return [...map.values()].sort((a, b) => a.course.localeCompare(b.course));
  }, [allGrades]);

  const getCourseGradeIds = useCallback((course) => (
    allGrades
      .filter((grade) => grade.course === course && isApprovableGrade(grade))
      .map((grade) => grade.id)
  ), [allGrades]);

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
      .map((student) => ({
        ...student,
        subjectCount: student.subjects.length,
        subjects: student.subjects.sort((a, b) => (a.subject_code || '').localeCompare(b.subject_code || '')),
      }))
      .sort((a, b) => {
        const last = a.last_name.localeCompare(b.last_name);
        return last !== 0 ? last : a.first_name.localeCompare(b.first_name);
      });
  }, [allGrades, search, selectedCourse, selectedYear]);

  const selectedStudent = useMemo(
    () => studentGroups.find((student) => student.studentKey === selectedStudentId) || null,
    [selectedStudentId, studentGroups]
  );

  const selectedStudentGrades = useMemo(() => {
    if (!selectedStudent) return [];

    const query = search.trim().toLowerCase();
    if (!query) return selectedStudent.subjects;

    return selectedStudent.subjects.filter((grade) => {
      const subject = `${grade.subject_code || ''} ${grade.subject_name || ''}`.toLowerCase();
      return subject.includes(query);
    });
  }, [search, selectedStudent]);

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedYear(null);
      setSelectedStudentId(null);
      setSelected(new Set());
      return;
    }

    if (!selectedYear && selectedCourse) {
      const firstYear = YEAR_LEVELS.find((year) => (yearCounts[year] || 0) > 0) || YEAR_LEVELS[0];
      setSelectedYear(firstYear);
    }
  }, [selectedCourse, selectedYear, yearCounts]);

  useEffect(() => {
    if (selectedStudentId && !studentGroups.some((student) => student.studentKey === selectedStudentId)) {
      setSelectedStudentId(null);
      setSelected(new Set());
    }
  }, [selectedStudentId, studentGroups]);

  useEffect(() => {
    setSelected(new Set());
  }, [selectedStudentId, selectedYear]);

  const selectCourse = (course) => {
    setSelectedCourse(course);
    setSelectedStudentId(null);
    setSearch('');
  };

  const selectYear = (year) => {
    setSelectedYear(year);
    setSelectedStudentId(null);
    setSearch('');
  };

  const selectStudent = (studentKey) => {
    setSelectedStudentId(studentKey);
    setSearch('');
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const approvableIds = selectedStudentGrades.filter(isApprovableGrade).map((grade) => grade.id);
    if (selected.size === approvableIds.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(approvableIds));
  };

  const approveSingle = async (id) => {
    setApproving(true);
    try {
      await client.post(`/grades/${id}/review`);
      showToast('Grade approved by the dean and forwarded to the registrar.');
      await loadGrades();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve grade.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const approveBatch = async (ids) => {
    if (!ids.length) return;

    setApproving(true);
    try {
      await client.post('/grades/batch-review', { ids });
      showToast(`${ids.length} grade record(s) approved by the dean and forwarded to the registrar.`);
      setSelected(new Set());
      await loadGrades();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve grades.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const approveCourseGrades = async (course) => {
    const ids = getCourseGradeIds(course);
    if (!ids.length) {
      showToast(`No submitted grades found for ${course}.`, 'error');
      return;
    }

    if (!await confirm({ title: 'Approve All Grades', message: `Approve all ${ids.length} submitted grade record(s) for ${course}?`, confirmLabel: 'Approve All', variant: 'info' })) return;
    await approveBatch(ids);
  };

  const totalPending = allGrades.filter((grade) => grade.submission_status === 'submitted').length;

  return (
    <div className="max-w-7xl p-6">
      {toast && (
        <div className={`fixed right-5 top-5 z-50 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        {(selectedCourse || selectedStudentId) && (
          <button
            onClick={() => {
              if (selectedStudentId) {
                setSelectedStudentId(null);
                setSearch('');
                return;
              }

              setSelectedCourse(null);
              setSelectedYear(null);
              setSearch('');
            }}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <div>
          <h1 className="text-xl font-black text-slate-900">
            {!selectedCourse
              ? 'Dean Grade Approvals'
              : !selectedStudent
                ? `${selectedCourse} - ${YEAR_LABEL[selectedYear]}`
                : `${selectedStudent.last_name}, ${selectedStudent.first_name}`}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {!selectedCourse
              ? `${totalPending} submitted grade record${totalPending !== 1 ? 's' : ''} waiting for dean approval`
              : !selectedStudent
                ? 'View submitted and approved grades for this course, or approve all submitted records in one click'
                : 'Submitted grades can still be approved here, while approved and official records stay visible for tracking'}
          </p>
          {schoolYear && semester && (
            <p className="mt-1 text-xs font-semibold text-[#7a1324]">
              Active Term: {activeTermLabel || `${schoolYear} - ${semester} Semester`}
            </p>
          )}
        </div>
      </div>

      {loading || termLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
            <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading grade approvals...
        </div>
      ) : !schoolYear || !semester ? (
        <div className="py-20 text-center text-slate-400">
          <p className="font-semibold">No active academic term set</p>
          <p className="mt-1 text-xs">Ask the admin to set the current school year and semester first.</p>
        </div>
      ) : !selectedCourse ? (
        courseSummary.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-12 w-12 opacity-40">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="font-semibold">No grade records available</p>
            <p className="mt-1 text-xs">{activeTermLabel || `${schoolYear} ${semester}`} has no grade approvals yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courseSummary.map((course) => (
              <div
                key={course.course}
                className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <button
                  onClick={() => selectCourse(course.course)}
                  className="w-full text-left"
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-5 w-5">
                      <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" />
                      <path d="M5 12v5c0 1.5 3.13 3 7 3s7-1.5 7-3v-5" />
                    </svg>
                  </div>
                  <p className="text-sm font-black text-slate-800 transition-colors group-hover:text-[#7a1324]">{course.course}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{course.total} total grade record(s)</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {YEAR_LEVELS.filter((year) => course.years[year]).map((year) => (
                      <span key={year} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Yr {year}: {course.years[year]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {course.submitted > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Submitted: {course.submitted}
                      </span>
                    )}
                    {course.approved > 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Approved: {course.approved}
                      </span>
                    )}
                    {course.official > 0 && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Official: {course.official}
                      </span>
                    )}
                    {course.draft > 0 && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Draft: {course.draft}
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => approveCourseGrades(course.course)}
                  disabled={approving || course.submitted === 0}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve All Grades
                </button>
              </div>
            ))}
          </div>
        )
      ) : !selectedStudent ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-black text-slate-900">{selectedCourse}</p>
              <p className="mt-1 text-xs text-slate-500">
                View all grade records in this course. Only submitted records can be approved.
              </p>
            </div>

            <button
              onClick={() => approveCourseGrades(selectedCourse)}
              disabled={approving || getCourseGradeIds(selectedCourse).length === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
            >
              Approve All {selectedCourse} Grades
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {YEAR_LEVELS.map((year) => {
              const count = yearCounts[year] || 0;
              return (
                <button
                  key={year}
                  onClick={() => selectYear(year)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    selectedYear === year
                      ? 'text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={selectedYear === year ? { background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' } : {}}
                >
                  {YEAR_LABEL[year]}
                  {count > 0 && (
                    <span className={`ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      selectedYear === year ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {count}
                    </span>
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
              onChange={(event) => setSearch(event.target.value)}
              className="input"
            />
          </div>

          {studentGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No grade records for {YEAR_LABEL[selectedYear]}</p>
              <p className="mt-1 text-xs">Try another year level or wait for teachers to encode grades.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {studentGroups.map((student) => (
                <StudentCard
                  key={student.studentKey}
                  student={student}
                  onClick={() => selectStudent(student.studentKey)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-black text-slate-900">
                {selectedStudent.last_name}, {selectedStudent.first_name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedStudent.student_number} | {selectedStudent.course} | Year {selectedStudent.year_level}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search subject..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input min-w-[220px]"
              />

              <button
                onClick={() => approveBatch(selectedStudent.subjects.filter(isApprovableGrade).map((grade) => grade.id))}
                disabled={approving || selectedStudent.subjects.filter(isApprovableGrade).length === 0}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
              >
                Approve all submitted
              </button>

              {selected.size > 0 && (
                <button
                  onClick={() => approveBatch([...selected])}
                  disabled={approving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve {selected.size} selected
                </button>
              )}
            </div>
          </div>

          {selectedStudentGrades.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No matching subjects found.</p>
              <p className="mt-1 text-xs">Try a different subject search term.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudentGrades.filter(isApprovableGrade).length > 0 &&
                          selected.size === selectedStudentGrades.filter(isApprovableGrade).length
                        }
                        onChange={toggleAll}
                        className="accent-[#7a1324]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Prelim</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Midterm</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Semi-Final</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Final</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedStudentGrades.map((grade) => (
                    <tr key={grade.id} className={selected.has(grade.id) ? 'bg-amber-50/60' : 'hover:bg-slate-50/70'}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(grade.id)}
                          disabled={!isApprovableGrade(grade)}
                          onChange={() => toggleSelect(grade.id)}
                          className="accent-[#7a1324]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{grade.subject_code}</p>
                        <p className="text-xs text-slate-400">{grade.subject_name}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><GradeValue value={grade.prelim_grade} /></td>
                      <td className="px-4 py-3 text-center"><GradeValue value={grade.midterm_grade} /></td>
                      <td className="px-4 py-3 text-center"><GradeValue value={grade.semi_final_grade} /></td>
                      <td className="px-4 py-3 text-center"><GradeValue value={grade.final_grade} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{grade.remarks || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_META[grade.submission_status || 'draft']?.cls || STATUS_META.draft.cls}`}>
                          {STATUS_META[grade.submission_status || 'draft']?.label || 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isApprovableGrade(grade) ? (
                          <button
                            onClick={() => approveSingle(grade.id)}
                            disabled={approving}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#5f0f1c,#7a1324)' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Approve
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            {grade.submission_status === 'under_review'
                              ? 'Approved'
                              : grade.submission_status === 'official'
                                ? 'Official'
                                : 'Waiting for submit'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-400">
                {selectedStudentGrades.length} subject record(s) shown
                {selected.size > 0 && ` | ${selected.size} selected`}
              </div>
            </div>
          )}
        </>
      )}
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
